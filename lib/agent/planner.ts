import { generateObject } from "ai";
import { groq, MODEL_ID } from "./groq";
import { PlanSchema, type Plan, type CallUsage } from "./types";
import { plannerPrompt } from "./prompts";
import { withGroqRetry, type RetryOptions } from "./retry";
import { reserveGroqBudget, estimateTokens } from "./rateLimiter";

export async function runPlanner(
  userPrompt: string,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ plan: Plan; usage: CallUsage }> {
  const prompt = plannerPrompt(userPrompt);
  // A plan is short structured JSON (name/description/techstack/features[]/
  // files[]) - even a 10-file project rarely needs more than ~900 tokens
  // for it. 1200 keeps generous headroom without reserving 2000 tokens of
  // an 8000 TPM budget on every single generation, small or large.
  const maxTokens = 1200;
  const settle = await reserveGroqBudget(estimateTokens(prompt) + maxTokens);

  const { object, usage } = await withGroqRetry(
    () =>
      generateObject({
        model: groq(MODEL_ID),
        schema: PlanSchema,
        prompt,
        // Without an explicit cap, Groq reserves a large default completion
        // budget for every request, which counts against the per-minute
        // token limit (TPM) even before generation happens - so small
        // prompts can still get rejected as "too large". Plans are short
        // structured JSON, so 1200 tokens is generous headroom (see cap
        // comment above).
        maxTokens,
      }),
    { onRetry }
  );
  settle(usage.totalTokens ?? maxTokens);
  return { plan: object, usage };
}
