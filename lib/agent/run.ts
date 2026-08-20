import { runPlanner } from "./planner";
import { runArchitect } from "./architect";
import { runCoderForFile } from "./coder";
import { qaCheckFile } from "./qa";
import { addUsage, emptyUsage, type GenerationEvent, type ImplementationTask, type Plan, type TaskPlan, type UsageTotals, type VirtualFS } from "./types";
import type { RetryOptions } from "./retry";
import { MODEL_ID } from "./groq";

// How many total coder attempts a single file gets before we give up and
// ship the last draft anyway (flagged, not silently). 1 initial attempt +
// this many repair retries.
const MAX_QA_REPAIR_ATTEMPTS = 1;

/**
 * Self-QA pass: after the coder writes a file, run cheap structural checks
 * (balanced HTML tags, balanced CSS braces, valid JS syntax - see qa.ts).
 * If something looks broken, hand the coder its own broken output plus the
 * specific problems found and ask it to fix them, before the file is ever
 * shown to the user. Turns "sometimes generates broken code" into "catches
 * its own mistakes."
 */
async function produceFileWithQA(
  task: ImplementationTask,
  plan: Plan,
  fs: VirtualFS,
  emit: (event: GenerationEvent) => void,
  onRetry: RetryOptions["onRetry"],
  usageTotals: UsageTotals
): Promise<string> {
  let { content, usage } = await runCoderForFile(task, plan, fs, onRetry);
  addUsage(usageTotals, usage);

  for (let attempt = 1; attempt <= MAX_QA_REPAIR_ATTEMPTS + 1; attempt++) {
    const issues = qaCheckFile(task.filepath, content);
    if (issues.length === 0) {
      emit({ type: "qa_pass", path: task.filepath });
      return content;
    }

    emit({
      type: "qa_issue",
      path: task.filepath,
      issues: issues.map((i) => i.message),
      attempt,
    });

    if (attempt > MAX_QA_REPAIR_ATTEMPTS) {
      // Out of repair attempts - ship the last draft rather than blocking
      // the whole build on one stubborn file.
      return content;
    }

    const repairTask: ImplementationTask = {
      filepath: task.filepath,
      task_description: `${task.task_description}

SELF-QA FEEDBACK: your previous attempt at this exact file failed these automated checks. Fix every issue and return the complete corrected file (not a diff, not just the fix - the full file):
${issues.map((i) => `- ${i.message}`).join("\n")}

Previous (broken) attempt to fix:
${content}`,
    };
    const repaired = await runCoderForFile(repairTask, plan, fs, onRetry);
    content = repaired.content;
    addUsage(usageTotals, repaired.usage);
  }

  return content;
}

/**
 * Runs the full Planner -> Architect -> Coder pipeline, calling `emit` for
 * every progress event so the caller can stream them to the client (SSE).
 */
export async function generateProject(
  userPrompt: string,
  emit: (event: GenerationEvent) => void
): Promise<void> {
  const onRetry = (attempt: number, waitMs: number) => {
    emit({
      type: "rate_limited",
      message: `Groq rate limit hit, retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt})...`,
      waitMs,
    });
  };

  const usageTotals = emptyUsage(MODEL_ID);

  try {
    emit({ type: "status", message: "Planning your project..." });
    const { plan, usage: plannerUsage } = await runPlanner(userPrompt, onRetry);
    addUsage(usageTotals, plannerUsage);
    emit({ type: "plan", plan });

    emit({ type: "status", message: "Breaking the plan into build tasks..." });
    let taskPlan: TaskPlan;
    if (plan.files.length <= 1) {
      // Skip the Architect round trip entirely for single-file plans (the
      // common case for a small page - "just a heading", a one-section
      // landing page, etc.). The Architect's job is to sequence
      // dependencies between multiple files and write cross-file
      // integration notes; with only one file there's nothing to
      // sequence, so the call is pure overhead - one extra LLM round
      // trip AND a ~3000-token reservation against the TPM budget (see
      // rateLimiter.ts) that then makes the very next call queue and
      // wait. This is the single biggest win for "small page taking
      // way longer than it should."
      const file = plan.files[0] ?? { path: "index.html", purpose: plan.description };
      taskPlan = {
        implementation_steps: [
          {
            filepath: file.path,
            task_description: `Build ${file.path} for this project: ${plan.description}. Purpose of this file: ${file.purpose}. Features: ${plan.features.join(", ")}.`,
          },
        ],
      };
    } else {
      const { taskPlan: generatedTaskPlan, usage: architectUsage } = await runArchitect(plan, onRetry);
      addUsage(usageTotals, architectUsage);
      taskPlan = generatedTaskPlan;
    }
    emit({ type: "task_plan", taskPlan });

    const fs: VirtualFS = {};
    const steps = taskPlan.implementation_steps;

    for (let i = 0; i < steps.length; i++) {
      const task = steps[i];
      emit({
        type: "file_start",
        path: task.filepath,
        index: i + 1,
        total: steps.length,
      });

      const content = await produceFileWithQA(task, plan, fs, emit, onRetry, usageTotals);
      fs[task.filepath] = content;

      emit({ type: "file_done", path: task.filepath, content });
    }

    emit({ type: "done", files: fs, plan, usage: usageTotals });
  } catch (err) {
    // Log the FULL error server-side (terminal in dev, Vercel function logs
    // in prod) - this is the only place that info is available. The
    // previous version only ever sent err.message to the client and never
    // logged anything here, so when a thrown error had an empty/missing
    // .message (common for some SDK/network errors, e.g. AI_APICallError
    // with no response body, or a bare `throw new Error()`), the terminal
    // showed nothing at all and the client just rendered "Error:" with
    // nothing after it - impossible to debug from either side.
    console.error("[generateProject] failed:", err);

    let message = "Generation failed";
    if (err instanceof Error) {
      message = err.message?.trim() ? err.message : err.name || "Generation failed";
      // AI SDK errors often carry the actually useful detail in `cause`
      // (e.g. the provider's raw response body) rather than `.message`.
      const cause = (err as { cause?: unknown }).cause;
      if (cause) {
        const causeStr = cause instanceof Error ? cause.message : String(cause);
        if (causeStr && causeStr !== message) message += ` (${causeStr})`;
      }
    } else if (err) {
      message = String(err);
    }

    emit({ type: "error", message });
  }
}
