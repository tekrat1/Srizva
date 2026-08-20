
import { generateObjectWithFallback, type AIProviderName } from "./groq";
import { PlanSchema, type Plan, type CallUsage } from "./types";
import { plannerPrompt } from "./prompts";
import { type RetryOptions } from "./retry";

export async function runPlanner(
  userPrompt: string,
  onRetry?: RetryOptions["onRetry"],
  preferredProvider?: AIProviderName | null
): Promise<{ plan: Plan; usage: CallUsage; providerUsed: AIProviderName }> {
  const prompt = plannerPrompt(userPrompt);
  // A plan is short structured JSON (name/description/techstack/features[]/
  // files[]) - even a 10-file project rarely needs more than ~900 tokens
  // for it. 1200 keeps generous headroom without reserving 2000 tokens of
  // an 8000 TPM budget on every single generation, small or large.
  const maxTokens = 900;
  // Provider fallback owns rate-limit handling. Do not block before provider selection.
  const settle = (_actualTokens?: number) => {};

  const { object, usage, providerUsed } = await generateObjectWithFallback({
        schema: PlanSchema,
        prompt,
        // Without an explicit cap, Groq reserves a large default completion
        // budget for every request, which counts against the per-minute
        // token limit (TPM) even before generation happens - so small
        // prompts can still get rejected as "too large". Plans are short
        // structured JSON, so 1200 tokens is generous headroom (see cap
        // comment above).
        maxTokens,
      }, preferredProvider);
  settle(usage.totalTokens ?? maxTokens);
  return { plan: object, usage, providerUsed };
}
