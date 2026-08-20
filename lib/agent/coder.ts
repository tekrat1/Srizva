import { generateText } from "ai";
import { groq, MODEL_ID } from "./groq";
import type { ImplementationTask, Plan, VirtualFS, CallUsage } from "./types";
import { coderSystemPrompt, coderTaskPrompt } from "./prompts";
import { withGroqRetry, type RetryOptions } from "./retry";
import { reserveGroqBudget, estimateTokens, clampTokenBudget } from "./rateLimiter";

// Strips accidental ```lang fences if the model adds them despite instructions.
function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// Rough token-budget guard so we never blow the model's context window on
// large projects, AND so a single call doesn't eat the whole per-minute
// token budget on Groq's on-demand tier (e.g. 8000 TPM for
// openai/gpt-oss-120b - a 40k-char/~10k-token context alone would already
// exceed that). ~4 chars/token is a conservative estimate for code.
//
// NOTE: Groq's TPM check counts prompt tokens PLUS the requested `maxTokens`
// completion budget, evaluated before generation even starts. So this char
// budget alone isn't enough - `maxTokens` below also has to be set
// explicitly (the SDK's default otherwise reserves way more than needed),
// and the two have to be sized to fit together under the cap.
const CONTEXT_CHAR_BUDGET = 8_000;

/**
 * Picks which existing files to show the coder for this task.
 *
 * Previously this only included .html/package.json/types* files, which
 * meant JS-to-JS dependencies (e.g. a component importing a shared util,
 * or referencing a shared data shape defined in another file) were
 * invisible to the model - a common source of drift on anything bigger
 * than a couple of files.
 *
 * Now: always include every existing file's FULL content, most-recently
 * written first (recent files are more likely relevant to what's being
 * built next), up to a character budget. If the whole project still fits,
 * everything is included - which is the common case for the small/medium
 * projects this pipeline targets.
 */
function selectContext(fs: VirtualFS): string {
  const entries = Object.entries(fs).reverse(); // most recent first
  const chunks: string[] = [];
  let used = 0;

  for (const [path, content] of entries) {
    const chunk = `--- ${path} ---\n${content}`;
    if (used + chunk.length > CONTEXT_CHAR_BUDGET) {
      // Budget exhausted - note what got left out instead of silently dropping it.
      chunks.push(`--- (${entries.length - chunks.length} more existing file(s) omitted for context length) ---`);
      break;
    }
    chunks.push(chunk);
    used += chunk.length;
  }

  return chunks.join("\n\n");
}

export async function runCoderForFile(
  task: ImplementationTask,
  plan: Plan,
  fs: VirtualFS,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ content: string; usage: CallUsage }> {
  const existingFilesList = Object.keys(fs).join("\n");
  const relevant = selectContext(fs);
  const system = coderSystemPrompt(JSON.stringify(plan));
  const prompt = coderTaskPrompt(task, existingFilesList, relevant);
  // Scaled to the task's own description length instead of a flat 3500 for
  // every file. A one-line "add an h1 saying hello" task doesn't need the
  // same reserved completion budget as a full page with several sections -
  // and because reserveGroqBudget() below charges maxTokens against the
  // TPM cap up front (see rateLimiter.ts), reserving 3500 on every call
  // regardless of size was the main reason small pages queued behind a
  // budget they never actually needed. The Architect writes longer, more
  // detailed task descriptions for genuinely bigger files, so description
  // length is a reasonable proxy for expected output size; the 3500
  // ceiling is unchanged, so nothing gets truncated on real multi-section
  // pages.
  const maxTokens = clampTokenBudget(task.task_description.length * 3, 700, 3500);

  // Wait (if needed) for real headroom in Groq's per-minute budget before
  // firing - see rateLimiter.ts. Replaces the old flat inter-file sleep:
  // zero wait when there's headroom, and never a call that was always
  // going to 429.
  const settle = await reserveGroqBudget(estimateTokens(system, prompt) + maxTokens);

  const { text, usage } = await withGroqRetry(
    () =>
      generateText({
        model: groq(MODEL_ID),
        system,
        prompt,
        // Capped so (input context + this) stays under Groq's TPM cap -
        // see maxTokens sizing above and CONTEXT_CHAR_BUDGET.
        maxTokens,
      }),
    { onRetry }
  );
  settle(usage.totalTokens ?? maxTokens);

  return { content: stripFences(text), usage };
}
