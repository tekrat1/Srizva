import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { runPlanner } from "../planner";
import { runArchitect } from "../architect";
import { runCoderForFile } from "../coder";
import { addUsage, emptyUsage, type GenerationEvent, type ImplementationTask, type Plan, type TaskPlan, type VirtualFS } from "../types";
import { MODEL_ID } from "../groq";
import type { RetryOptions } from "../retry";
import { buildDependencyGraph } from "../nodes/dependencies";
import { selectRelevantContext } from "../nodes/context";
import { validateProject } from "../nodes/validate";
import { runFinalReview } from "../nodes/finalReview";
import { AgentState, type AgentStateType, type AgentEventEmitter, type ValidationIssue } from "./state";
import { buildFastPlan, buildFastTaskPlan, isSimpleProjectRequest } from "../complexity";

const MAX_REPAIR_ATTEMPTS = Number(process.env.SRIZVA_MAX_REPAIR_ATTEMPTS || 2);
const generationCheckpointer = new MemorySaver();

function ensureCoreStaticFiles(plan: Plan): Plan {
  const paths = plan.files.map((f) => f.path.toLowerCase());
  const files = [...plan.files];
  if (!paths.some((p) => p.endsWith(".html"))) files.unshift({ path: "index.html", purpose: plan.description });
  if (!paths.some((p) => p.endsWith(".css"))) files.push({ path: "style.css", purpose: "Styling, typography, layout, spacing and motion." });
  if (!paths.some((p) => p.endsWith(".js"))) files.push({ path: "script.js", purpose: "Interactivity and behavior." });
  return files.length === plan.files.length ? plan : { ...plan, files };
}

function retryHandler(emit: AgentEventEmitter): RetryOptions["onRetry"] {
  return (attempt, waitMs) => emit({
    type: "rate_limited",
    message: `Rate limit hit, retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt})...`,
    waitMs,
  });
}

export function createGenerationGraph(emit: AgentEventEmitter) {
  const onRetry = retryHandler(emit);

  const graph = new StateGraph(AgentState)
    .addNode("requirements", async (state: AgentStateType) => {
      emit({ type: "status", message: "Understanding requirements..." });
      return { iteration: state.iteration + 1 };
    })
    .addNode("fastPlan", async (state: AgentStateType) => {
      const plan = buildFastPlan(state.userRequest);
      const taskPlan = buildFastTaskPlan(plan, state.userRequest);
      emit({ type: "status", message: "Simple project detected — using fast build path." });
      emit({ type: "plan", plan });
      emit({ type: "task_plan", taskPlan });
      return {
        fastPath: true,
        plan,
        taskPlan,
        tasks: taskPlan.implementation_steps,
        currentTaskIndex: 0,
        currentTask: taskPlan.implementation_steps[0] ?? null,
      };
    })
    .addNode("planner", async (state: AgentStateType) => {
      emit({ type: "status", message: "Planning your project..." });
      const result = await runPlanner(state.userRequest, onRetry, state.stickyProvider);
      const plan = ensureCoreStaticFiles(result.plan);
      const usage = state.usage ?? emptyUsage(MODEL_ID);
      addUsage(usage, result.usage);
      emit({ type: "plan", plan });
      return { plan, usage, stickyProvider: result.providerUsed };
    })
    .addNode("architect", async (state: AgentStateType) => {
      const plan = state.plan!;
      emit({ type: "status", message: "Designing the implementation workflow..." });
      let taskPlan: TaskPlan;
      let usage = state.usage ?? emptyUsage(MODEL_ID);

      let stickyProvider = state.stickyProvider;
      if (plan.files.length === 1) {
        const file = plan.files[0];
        taskPlan = {
          implementation_steps: [{
            filepath: file.path,
            task_description: `Build ${file.path}. ${file.purpose}. Project: ${plan.description}. Features: ${plan.features.join(", ")}.`,
          }],
        };
      } else {
        const result = await runArchitect(plan, onRetry, stickyProvider);
        taskPlan = result.taskPlan;
        addUsage(usage, result.usage);
        stickyProvider = result.providerUsed;
      }

      // Guard against an LLM task plan accidentally omitting a planned file.
      const existing = new Set(taskPlan.implementation_steps.map((t: ImplementationTask) => t.filepath));
      for (const file of plan.files) {
        if (!existing.has(file.path)) {
          taskPlan.implementation_steps.push({
            filepath: file.path,
            task_description: `Implement ${file.path}: ${file.purpose}. Integrate it with the project files already created.`,
          });
        }
      }

      emit({ type: "task_plan", taskPlan });
      return {
        taskPlan,
        tasks: taskPlan.implementation_steps,
        currentTaskIndex: 0,
        currentTask: taskPlan.implementation_steps[0] ?? null,
        usage,
        stickyProvider,
      };
    })
    .addNode("context", async (state: AgentStateType) => {
      const task = state.currentTask;
      if (!task || !state.plan) return {};
      const dependencyGraph = buildDependencyGraph(state.files);
      const context = selectRelevantContext(
        task.filepath,
        task.task_description,
        state.files,
        dependencyGraph,
        state.fastPath ? 4000 : 6500
      );
      emit({
        type: "status",
        message: `Selecting relevant context for ${task.filepath}...`,
      });
      return { dependencyGraph, relevantContext: context };
    })
    .addNode("coder", async (state: AgentStateType) => {
      const task = state.currentTask;
      const plan = state.plan;
      if (!task || !plan) throw new Error("Coder reached the graph without a task or plan.");

      const index = state.currentTaskIndex;
      emit({
        type: "file_start",
        path: task.filepath,
        index: index + 1,
        total: state.tasks.length,
      });

      const attempts = state.repairAttempts[task.filepath] ?? 0;
      const isRepair = attempts > 0 || state.currentIssues.length > 0;
      const repairInstructions = state.currentIssues.length
        ? `\n\nREPAIR MODE. Fix these verified issues and preserve unrelated behavior:\n${state.currentIssues.map((x: string) => `- ${x}`).join("\n")}`
        : "";
      const taskForCoder: ImplementationTask = {
        ...task,
        task_description: `${task.task_description}${repairInstructions}`,
      };

      const result = await runCoderForFile(
        taskForCoder,
        plan,
        state.files,
        onRetry,
        isRepair ? state.files[task.filepath] ?? null : null,
        state.relevantContext,
        state.fastPath ? 4000 : 8000,
        state.stickyProvider
      );

      const files: VirtualFS = { ...state.files };
      const previousContent = files[task.filepath] ?? null;
      files[task.filepath] = result.content;

      const usage = state.usage ?? emptyUsage(MODEL_ID);
      addUsage(usage, result.usage);

      emit({ type: "file_done", path: task.filepath, content: result.content });

      return {
        files,
        usage,
        stickyProvider: result.providerUsed,
        generationFinishReason: result.usage.finishReason ?? null,
        changes: [
          ...state.changes,
          {
            path: task.filepath,
            previousContent,
            newContent: result.content,
            agent: isRepair ? "repair-agent" : "coder-agent",
            taskId: task.filepath,
            timestamp: Date.now(),
            reason: isRepair ? state.currentIssues.join("; ") : task.task_description,
          },
        ],
      };
    })
    .addNode("qa", async (state: AgentStateType) => {
      const task = state.currentTask;
      if (!task) return {};
      const { qaCheckFile } = await import("../qa");
      const issues = qaCheckFile(task.filepath, state.files[task.filepath] ?? "");
      const generationIssue =
        state.generationFinishReason === "length"
          ? [{ message: "Model output was cut off at the token limit; the generated file must be regenerated completely." }]
          : [];
      const allIssues = [...generationIssue, ...issues];
      if (allIssues.length) {
        const messages = allIssues.map((i) => i.message);
        const attempts = (state.repairAttempts[task.filepath] ?? 0) + 1;
        emit({
          type: "qa_issue",
          path: task.filepath,
          issues: messages,
          attempt: attempts,
        });
        return {
          currentIssues: messages,
          repairReason: "file" as const,
          repairAttempts: { ...state.repairAttempts, [task.filepath]: attempts },
        };
      }
      emit({ type: "qa_pass", path: task.filepath });
      return { currentIssues: [], generationFinishReason: null };
    })
    .addNode("advance", async (state: AgentStateType) => {
      const next = state.currentTaskIndex + 1;
      const done = next >= state.tasks.length;
      return {
        currentTaskIndex: next,
        currentTask: done ? null : state.tasks[next],
        completedTasks: state.currentTask
          ? [...state.completedTasks, state.currentTask.filepath]
          : state.completedTasks,
        currentIssues: [],
        repairReason: null,
        validationIssues: [],
      };
    })
    .addNode("validate", async (state: AgentStateType) => {
      emit({ type: "status", message: "Running project-wide validation..." });
      const validationIssues = validateProject(state.files);
      if (validationIssues.length) {
        emit({
          type: "status",
          message: `Found ${validationIssues.length} integration issue(s); repairing targeted files...`,
        });
      } else {
        emit({ type: "status", message: "Project validation passed." });
      }
      return { validationIssues };
    })
    .addNode("prepareValidationRepair", async (state: AgentStateType) => {
      const issue = state.validationIssues[0];
      if (!issue) return {};
      const taskIndex = state.tasks.findIndex((task: ImplementationTask) => task.filepath === issue.path);
      if (taskIndex < 0) {
        return {
          lastError: `Validation issue could not be mapped to a task: ${issue.path} — ${issue.message}`,
          finalStatus: "failed" as const,
        };
      }
      const attempts = (state.repairAttempts[issue.path] ?? 0) + 1;
      return {
        currentTaskIndex: taskIndex,
        currentTask: state.tasks[taskIndex],
        currentIssues: [issue.message],
        repairReason: "validation" as const,
        repairAttempts: { ...state.repairAttempts, [issue.path]: attempts },
      };
    })
    .addNode("finalReview", async (state: AgentStateType) => {
      if (!state.plan) return {};
      emit({ type: "status", message: "Performing final agent review..." });
      const result = await runFinalReview(state.plan, state.files, onRetry, state.stickyProvider);
      let usage = state.usage ?? emptyUsage(MODEL_ID);
      if (result.usage) addUsage(usage, result.usage);
      const stickyProvider = result.providerUsed ?? state.stickyProvider;
      if (!result.passed && result.issues.length) {
        const issueMessages = result.issues.map((i) => `${i.path}: ${i.message}`);
        emit({ type: "status", message: `Final review found ${result.issues.length} issue(s).` });
        return { currentIssues: issueMessages, usage, stickyProvider, validationIssues: result.issues.map((i) => ({
          path: i.path,
          message: i.message,
          kind: "integration" as const,
        })) };
      }
      emit({ type: "status", message: "Final agent review passed." });
      return { usage, stickyProvider, finalStatus: "completed" as const };
    })
    .addNode("fail", async (state: AgentStateType) => {
      const message = state.lastError || "Generation stopped after reaching the repair limit.";
      emit({ type: "error", message });
      return { finalStatus: "failed" as const };
    })
    .addNode("finish", async (state: AgentStateType) => {
      emit({ type: "done", files: state.files, plan: state.plan!, usage: state.usage ?? emptyUsage(MODEL_ID) });
      return { finalStatus: "completed" as const };
    });

  graph
    .addEdge(START, "requirements")
    .addConditionalEdges("requirements", (state: AgentStateType) =>
      isSimpleProjectRequest(state.userRequest) ? "fastPlan" : "planner", {
        fastPlan: "fastPlan",
        planner: "planner",
      })
    .addEdge("fastPlan", "context")
    .addEdge("planner", "architect")
    .addEdge("architect", "context")
    .addEdge("context", "coder")
    .addEdge("coder", "qa")
    .addConditionalEdges("qa", (state: AgentStateType) => {
      // Turbo mode: no per-file repair loop, ever - move on regardless of
      // QA issues. (The base sanitizer + prompt hardening still catch the
      // tool-call-leak class of bug before this point; turbo mode just
      // skips the LLM repair round-trip for everything else.)
      if (state.turboMode) {
        return state.repairReason === "validation" ? "revalidate" : "advance";
      }
      if (state.currentIssues.length === 0) {
        return state.repairReason === "validation" ? "revalidate" : "advance";
      }
      const task = state.currentTask;
      const attempts = task ? (state.repairAttempts[task.filepath] ?? 0) : MAX_REPAIR_ATTEMPTS + 1;
      if (attempts <= MAX_REPAIR_ATTEMPTS) return "repair";
      return "fail";
    }, {
      repair: "context",
      advance: "advance",
      revalidate: "validate",
      fail: "fail",
    })
    .addConditionalEdges("advance", (state: AgentStateType) =>
      state.currentTask ? "context" : "validate", {
        context: "context",
        validate: "validate",
      })
    .addConditionalEdges("validate", (state: AgentStateType) => {
      // BUGFIX: this branch can return "finish" (fastPath with zero
      // validation issues, or turboMode skipping finalReview entirely),
      // but "finish" was missing from the destination map below - that's
      // the exact cause of "Branch condition returned unknown or null
      // destination" crashing generations mid-run. Every string this
      // function can return must be a key in the map.
      if (state.validationIssues.length === 0) {
        return state.fastPath || state.turboMode ? "finish" : "finalReview";
      }
      if (state.turboMode) return "finish"; // turbo mode never repairs post-hoc either
      const issue = state.validationIssues[0];
      const attempts = state.repairAttempts[issue.path] ?? 0;
      if (attempts >= MAX_REPAIR_ATTEMPTS) return "fail";
      return "prepare";
    }, {
      finish: "finish",
      finalReview: "finalReview",
      prepare: "prepareValidationRepair",
      fail: "fail",
    })
    .addConditionalEdges("prepareValidationRepair", (state: AgentStateType) =>
      state.finalStatus === "failed" ? "fail" : "context", {
        fail: "fail",
        context: "context",
      })
    .addConditionalEdges("finalReview", (state: AgentStateType) => {
      if (state.finalStatus === "completed") return "finish";
      const issue = state.validationIssues[0];
      if (!issue) return "finish";
      const attempts = state.repairAttempts[issue.path] ?? 0;
      if (attempts >= MAX_REPAIR_ATTEMPTS) return "fail";
      return "prepare";
    }, {
      finish: "finish",
      prepare: "prepareValidationRepair",
      fail: "fail",
    })
    .addEdge("fail", END)
    .addEdge("finish", END);

  return graph.compile({ checkpointer: generationCheckpointer });
}

export async function runGenerationGraph(
  userRequest: string,
  emit: AgentEventEmitter,
  turboMode = false
): Promise<void> {
  const app = createGenerationGraph(emit);
  const threadId = `generation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await app.invoke({
    userRequest,
    mode: "generate",
    files: {},
    originalFiles: {},
    maxIterations: 40,
    finalStatus: "running",
    turboMode,
  }, { configurable: { thread_id: threadId }, recursionLimit: 200 });
}
