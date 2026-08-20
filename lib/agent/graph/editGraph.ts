import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { planEdit, editFileOnce } from "../edit";
import { qaCheckFile } from "../qa";
import { addUsage, emptyUsage, type Plan } from "../types";
type EditEvent = import("../edit").EditEvent;
import { MODEL_ID } from "../groq";
import { buildDependencyGraph } from "../nodes/dependencies";
import { selectRelevantContext } from "../nodes/context";
import { validateProject } from "../nodes/validate";
import { AgentState } from "./state";

const MAX_REPAIR_ATTEMPTS = Number(process.env.SRIZVA_MAX_REPAIR_ATTEMPTS || 2);
const editCheckpointer = new MemorySaver();

export function createEditGraph(
  emit: (event: EditEvent) => void
) {
  const onRetry = (attempt: number, waitMs: number) => emit({
    type: "rate_limited",
    message: `Rate limit hit, retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt})...`,
    waitMs,
  });

  const graph = new StateGraph(AgentState)
    .addNode("editPlan", async (state: import("./state").AgentStateType) => {
      emit({ type: "status", message: "Analyzing which files need to change..." });
      const result = await planEdit(state.userRequest, state.files, onRetry);
      const usage = state.usage ?? emptyUsage(MODEL_ID);
      addUsage(usage, result.usage);
      const tasks = result.taskPlan.implementation_steps;
      return {
        taskPlan: result.taskPlan,
        tasks,
        currentTaskIndex: 0,
        currentTask: tasks[0] ?? null,
        usage,
      };
    })
    .addNode("context", async (state: import("./state").AgentStateType) => {
      const task = state.currentTask;
      if (!task) return {};
      const graph = buildDependencyGraph(state.files);
      const context = selectRelevantContext(task.filepath, task.task_description, state.files, graph, 6500);
      return { dependencyGraph: graph, relevantContext: context };
    })
    .addNode("editCoder", async (state: import("./state").AgentStateType) => {
      const task = state.currentTask;
      const plan = state.plan;
      if (!task || !plan) throw new Error("Edit coder reached the graph without task/plan.");
      emit({
        type: "file_start",
        path: task.filepath,
        index: state.currentTaskIndex + 1,
        total: state.tasks.length,
      });

      const issues = state.currentIssues;
      const repairSuffix = issues.length
        ? `\n\nREPAIR VERIFIED ISSUES:\n${issues.map((x: string) => `- ${x}`).join("\n")}`
        : "";
      const result = await editFileOnce(
        { ...task, task_description: `${task.task_description}${repairSuffix}` },
        plan,
        state.files[task.filepath] ?? null,
        state.relevantContext,
        onRetry
      );

      const previousContent = state.files[task.filepath] ?? null;
      const files = { ...state.files, [task.filepath]: result.content };
      const usage = state.usage ?? emptyUsage(MODEL_ID);
      addUsage(usage, result.usage);
      emit({ type: "file_done", path: task.filepath, content: result.content });

      return {
        files,
        usage,
        generationFinishReason: result.usage.finishReason ?? null,
        changes: [
          ...state.changes,
          {
            path: task.filepath,
            previousContent,
            newContent: result.content,
            agent: issues.length ? "edit-repair-agent" : "edit-agent",
            taskId: task.filepath,
            timestamp: Date.now(),
            reason: issues.join("; ") || task.task_description,
          },
        ],
      };
    })
    .addNode("qa", async (state: import("./state").AgentStateType) => {
      const task = state.currentTask;
      if (!task) return {};
      const issues = qaCheckFile(task.filepath, state.files[task.filepath] ?? "");
      const generationIssue =
        state.generationFinishReason === "length"
          ? [{ message: "Model output was cut off at the token limit; the edited file must be regenerated completely." }]
          : [];
      const allIssues = [...generationIssue, ...issues];
      if (allIssues.length) {
        const messages = allIssues.map((i) => i.message);
        const attempts = (state.repairAttempts[task.filepath] ?? 0) + 1;
        emit({ type: "qa_issue", path: task.filepath, issues: messages, attempt: attempts });
        return {
          currentIssues: messages,
          repairAttempts: { ...state.repairAttempts, [task.filepath]: attempts },
        };
      }
      emit({ type: "qa_pass", path: task.filepath });
      return { currentIssues: [], generationFinishReason: null };
    })
    .addNode("advance", async (state: import("./state").AgentStateType) => {
      const next = state.currentTaskIndex + 1;
      const done = next >= state.tasks.length;
      return {
        currentTaskIndex: next,
        currentTask: done ? null : state.tasks[next],
        currentIssues: [],
      };
    })
    .addNode("validate", async (state: import("./state").AgentStateType) => {
      const validationIssues = validateProject(state.files);
      return { validationIssues };
    })
    .addNode("finish", async (state: import("./state").AgentStateType) => {
      emit({ type: "done", files: state.files, usage: state.usage ?? emptyUsage(MODEL_ID) });
      return { finalStatus: "completed" as const };
    })
    .addNode("fail", async (state: import("./state").AgentStateType) => {
      emit({ type: "error", message: state.lastError || "Edit failed after the configured repair limit." });
      return { finalStatus: "failed" as const };
    });

  graph
    .addEdge(START, "editPlan")
    .addEdge("editPlan", "context")
    .addEdge("context", "editCoder")
    .addEdge("editCoder", "qa")
    .addConditionalEdges("qa", (state: import("./state").AgentStateType) => {
      if (state.currentIssues.length === 0) return "advance";
      const task = state.currentTask;
      const attempts = task ? (state.repairAttempts[task.filepath] ?? 0) : MAX_REPAIR_ATTEMPTS + 1;
      return attempts <= MAX_REPAIR_ATTEMPTS ? "repair" : "fail";
    }, {
      repair: "context",
      advance: "advance",
      fail: "fail",
    })
    .addConditionalEdges("advance", (state: import("./state").AgentStateType) =>
      state.currentTask ? "context" : "validate", {
        context: "context",
        validate: "validate",
      })
    .addConditionalEdges("validate", (state: import("./state").AgentStateType) =>
      state.validationIssues.length === 0 ? "finish" : "fail", {
        finish: "finish",
        fail: "fail",
      })
    .addEdge("finish", END)
    .addEdge("fail", END);

  return graph.compile({ checkpointer: editCheckpointer });
}

export async function runEditGraph(
  instruction: string,
  currentFiles: Record<string, string>,
  plan: Plan,
  emit: (event: EditEvent) => void
) {
  const app = createEditGraph(emit);
  const threadId = `edit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await app.invoke({
    userRequest: instruction,
    mode: "edit",
    files: currentFiles,
    originalFiles: currentFiles,
    plan,
    maxIterations: 30,
    finalStatus: "running",
  }, { configurable: { thread_id: threadId }, recursionLimit: 200 });
}
