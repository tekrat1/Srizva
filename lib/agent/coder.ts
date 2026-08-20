import { generateTextWithFallback, type AIProviderName } from "./groq";
import type { ImplementationTask, Plan, VirtualFS, CallUsage } from "./types";
import { coderSystemPrompt, coderTaskPrompt } from "./prompts";
import { type RetryOptions } from "./retry";
import { clampTokenBudget } from "./rateLimiter";
import { sanitizeToolCallArtifacts } from "./sanitize";

// Strips accidental ```lang fences if the model adds them despite instructions.
function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// Some free-tier OpenRouter models leak their internal tool-call protocol
// (e.g. `<|tool_call_start|>[write(file='index.html', content='...')]`)
// instead of returning plain file content. Clean that up before the text
// ever reaches fence-stripping, QA, or the preview.
function cleanModelOutput(content: string): string {
  return stripFences(sanitizeToolCallArtifacts(content));
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
function selectContext(fs: VirtualFS, contextCharBudget = CONTEXT_CHAR_BUDGET): string {
  const entries = Object.entries(fs).reverse(); // most recent first
  const chunks: string[] = [];
  let used = 0;

  for (const [path, content] of entries) {
    const chunk = `--- ${path} ---\n${content}`;
    if (used + chunk.length > contextCharBudget) {
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
  onRetry?: RetryOptions["onRetry"],
  currentContent?: string | null,
  precomputedContext?: string,
  contextCharBudget = CONTEXT_CHAR_BUDGET,
  preferredProvider?: AIProviderName | null
): Promise<{ content: string; usage: CallUsage; providerUsed: AIProviderName }> {
  const existingFilesList = Object.keys(fs).join("\n");
  // Prefer the dependency-aware context selected by the graph's "context"
  // node (nodes/context.ts - target's direct deps, reverse deps, and
  // keyword-ranked related files). Only fall back to dumping the
  // most-recent files here if the graph didn't hand us a selection (e.g.
  // a caller invoking the coder directly outside the graph).
  const relevant = precomputedContext && precomputedContext.trim().length > 0
    ? precomputedContext
    : selectContext(fs, contextCharBudget);
  const system = coderSystemPrompt(JSON.stringify(plan));
  const prompt = coderTaskPrompt(task, existingFilesList, relevant, currentContent);
  // Do not derive the completion budget from task-description length alone.
  // A short task description can still require a large complete file. This
  // was the source of silent truncation (finishReason === "length").
  const ext = task.filepath.split(".").pop()?.toLowerCase();
  const baseline =
    ext === "js" || ext === "mjs" ? 2200 :
    ext === "css" ? 2200 :
    ext === "html" || ext === "htm" ? 1800 :
    2400;
  const existingDemand = currentContent ? Math.ceil(currentContent.length / 3.5) + 500 : 0;
  const descriptionDemand = Math.ceil(task.task_description.length * 2.5);
  let maxTokens = clampTokenBudget(
    Math.max(baseline, existingDemand, descriptionDemand),
    1200,
    3200
  );

  // A length finish is an explicit truncation signal. Retry once with a
  // larger completion budget rather than allowing syntactically-valid
  // garbage such as `document.getElement` to reach the preview.
  let lastResult: { text: string; usage: CallUsage; finishReason?: string; providerUsed: AIProviderName } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Provider fallback owns rate-limit handling; do not reserve Groq before provider selection.
    const settle = (_actualTokens?: number) => {};
    const result = await generateTextWithFallback({
              system,
          prompt:
            attempt === 0
              ? prompt
              : `${prompt}\n\nCRITICAL: Your previous response was truncated before the file was complete. Return the COMPLETE file from the first character to the last character. Do not stop early. Do not use placeholders or omit code.`,
          maxTokens,
        }, preferredProvider);
    settle(result.usage.totalTokens ?? maxTokens);
    lastResult = result;
    if (result.finishReason !== "length") break;
    maxTokens = Math.min(3800, Math.max(maxTokens + 800, Math.ceil(maxTokens * 1.35)));
  }

  if (!lastResult) throw new Error("Coder returned no result.");
  return {
    content: cleanModelOutput(lastResult.text),
    usage: { ...lastResult.usage, finishReason: lastResult.finishReason },
    providerUsed: lastResult.providerUsed,
  };
}
