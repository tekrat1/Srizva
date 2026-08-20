
import { generateObjectWithFallback, generateTextWithFallback, MODEL_ID } from "./groq";
import {
  TaskPlanSchema,
  addUsage,
  emptyUsage,
  type CallUsage,
  type ImplementationTask,
  type Plan,
  type UsageTotals,
  type VirtualFS,
} from "./types";
import {
  editPlannerPrompt,
  editCoderSystemPrompt,
  editCoderTaskPrompt,
} from "./prompts";
import { type RetryOptions } from "./retry";
import { qaCheckFile } from "./qa";
import { clampTokenBudget } from "./rateLimiter";

function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/** Decides which files need to change to satisfy the requested edit. */
export async function planEdit(
  instruction: string,
  files: VirtualFS,
  onRetry?: RetryOptions["onRetry"]
) {
  const currentFilesList = Object.keys(files).join("\n");
  const prompt = editPlannerPrompt(instruction, currentFilesList);
  // Scaled to how many files exist to edit against, same reasoning as
  // architect.ts - a 1-2 file project's edit plan doesn't need the same
  // reserved budget as a 10-file one, and the flat number was reserved
  // against Groq's TPM cap before the call even ran.
  const maxTokens = clampTokenBudget(400 + Object.keys(files).length * 180, 600, 2200);
  // Provider fallback owns rate-limit handling.
  const settle = (_actualTokens?: number) => {};

  const { object, usage } = await generateObjectWithFallback({
        schema: TaskPlanSchema,
        prompt,
        // See CONTEXT_CHAR_BUDGET note below - Groq counts requested
        // completion tokens against the TPM cap up front.
        maxTokens,
      });
  settle(usage.totalTokens ?? maxTokens);
  return { taskPlan: object, usage };
}

// Kept small so a single call doesn't eat the whole per-minute token
// budget on Groq's on-demand tier - see coder.ts for the full explanation.
// This applies to BOTH the other-files context below and the file being
// edited itself (previously uncapped, which is what caused "Request too
// large" errors when editing a big index.html: input context + the SDK's
// default (unset) maxTokens completion reservation together blew past the
// 8000 TPM limit).
const CONTEXT_CHAR_BUDGET = 5_000;
const CURRENT_FILE_CHAR_BUDGET = 5_000;

function otherFilesContext(files: VirtualFS, excludePath: string): string {
  const entries = Object.entries(files).filter(([p]) => p !== excludePath);
  const chunks: string[] = [];
  let used = 0;
  for (const [path, content] of entries) {
    const chunk = `--- ${path} ---\n${content}`;
    if (used + chunk.length > CONTEXT_CHAR_BUDGET) break;
    chunks.push(chunk);
    used += chunk.length;
  }
  return chunks.join("\n\n");
}

function capCurrentContent(content: string | null): string | null {
  if (!content || content.length <= CURRENT_FILE_CHAR_BUDGET) return content;
  return (
    content.slice(0, CURRENT_FILE_CHAR_BUDGET) +
    `\n<!-- (truncated - file continues for ${content.length - CURRENT_FILE_CHAR_BUDGET} more chars, cut to fit the token budget) -->`
  );
}

export type EditEvent =
  | { type: "status"; message: string }
  | { type: "rate_limited"; message: string; waitMs: number }
  | { type: "file_start"; path: string; index: number; total: number }
  | { type: "qa_issue"; path: string; issues: string[]; attempt: number }
  | { type: "qa_pass"; path: string }
  | { type: "file_done"; path: string; content: string }
  | { type: "done"; files: VirtualFS; usage: UsageTotals }
  | { type: "error"; message: string };

const MAX_QA_REPAIR_ATTEMPTS = 1;

/** One coder call for an edit task - extracted so the QA wrapper below can call it again for repairs. */
export async function editFileOnce(
  task: ImplementationTask,
  plan: Plan,
  currentContent: string | null,
  context: string,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ content: string; usage: CallUsage }> {
  const system = editCoderSystemPrompt(JSON.stringify(plan));
  const prompt = editCoderTaskPrompt(task, currentContent, context);
  // Never size the completion budget from task-description length alone.
  // Short descriptions can still produce large files. Prefer a file-type
  // baseline and the size of the existing file, with a bounded retry if the
  // provider explicitly reports finishReason === "length".
  const ext = task.filepath.split(".").pop()?.toLowerCase();
  const baseline =
    ext === "js" || ext === "mjs" ? 2200 :
    ext === "css" ? 2200 :
    ext === "html" || ext === "htm" ? 1800 :
    2400;
  let maxTokens = clampTokenBudget(
    Math.max(baseline, currentContent ? Math.ceil(currentContent.length / 3.5) + 500 : 0),
    1200,
    3200
  );

  let lastResult: { text: string; usage: CallUsage; finishReason?: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Do not reserve Groq budget before provider selection; fallback may use Gemini/OpenRouter.
    const settle = (_actualTokens?: number) => {};
    const result = await generateTextWithFallback({
              system,
          prompt:
            attempt === 0
              ? prompt
              : `${prompt}\n\nCRITICAL: The previous response was truncated. Return the COMPLETE file, preserving all existing behavior and finishing every statement/function.`,
          maxTokens,
        });
    settle(result.usage.totalTokens ?? maxTokens);
    lastResult = result;
    if (result.finishReason !== "length") break;
    maxTokens = Math.min(3800, Math.max(maxTokens + 800, Math.ceil(maxTokens * 1.35)));
  }

  if (!lastResult) throw new Error("Edit coder returned no result.");
  return {
    content: stripFences(lastResult.text),
    usage: { ...lastResult.usage, finishReason: lastResult.finishReason },
  };
}

/**
 * Same self-QA-and-repair pass as the fresh-generation pipeline (see
 * qa.ts / run.ts) - after an edit is applied to a file, check it still
 * parses cleanly, and if not, hand the model its own broken output plus
 * the specific problems and ask it to fix them before it's ever shown as
 * a proposed change to the user.
 */
async function produceEditWithQA(
  task: ImplementationTask,
  plan: Plan,
  currentContent: string | null,
  context: string,
  emit: (event: EditEvent) => void,
  onRetry: RetryOptions["onRetry"] | undefined,
  usageTotals: UsageTotals
): Promise<string> {
  let { content, usage } = await editFileOnce(task, plan, currentContent, context, onRetry);
  addUsage(usageTotals, usage);

  for (let attempt = 1; attempt <= MAX_QA_REPAIR_ATTEMPTS + 1; attempt++) {
    const issues = qaCheckFile(task.filepath, content);
    if (issues.length === 0) {
      emit({ type: "qa_pass", path: task.filepath });
      return content;
    }

    emit({ type: "qa_issue", path: task.filepath, issues: issues.map((i) => i.message), attempt });

    if (attempt > MAX_QA_REPAIR_ATTEMPTS) {
      return content;
    }

    const repairTask: ImplementationTask = {
      filepath: task.filepath,
      task_description: `${task.task_description}

SELF-QA FEEDBACK: your previous attempt at this exact file failed these automated checks. Fix every issue and return the complete corrected file (not a diff - the full file):
${issues.map((i) => `- ${i.message}`).join("\n")}

Previous (broken) attempt to fix:
${content}`,
    };
    const repaired = await editFileOnce(repairTask, plan, currentContent, context, onRetry);
    content = repaired.content;
    addUsage(usageTotals, repaired.usage);
  }

  return content;
}

/**
 * Applies a natural-language edit instruction to an existing project.
 * Only touches the files the edit-planner decides are actually affected -
 * everything else in `files` is carried over unchanged.
 */
export async function editProject(
  instruction: string,
  currentFiles: VirtualFS,
  plan: Plan,
  emit: (event: EditEvent) => void
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
    emit({ type: "status", message: "Figuring out what needs to change..." });
    const { taskPlan, usage: planUsage } = await planEdit(instruction, currentFiles, onRetry);
    addUsage(usageTotals, planUsage);
    const steps = taskPlan.implementation_steps;

    const updated: VirtualFS = { ...currentFiles };

    for (let i = 0; i < steps.length; i++) {
      const task = steps[i];
      emit({ type: "file_start", path: task.filepath, index: i + 1, total: steps.length });

      const currentContent = capCurrentContent(currentFiles[task.filepath] ?? null);
      const context = otherFilesContext(updated, task.filepath);

      const content = await produceEditWithQA(task, plan, currentContent, context, emit, onRetry, usageTotals);
      updated[task.filepath] = content;
      emit({ type: "file_done", path: task.filepath, content });
    }

    emit({ type: "done", files: updated, usage: usageTotals });
  } catch (err) {
    console.error("[editProject] failed:", err);

    let message = "Edit failed";
    if (err instanceof Error) {
      message = err.message?.trim() ? err.message : err.name || "Edit failed";
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
