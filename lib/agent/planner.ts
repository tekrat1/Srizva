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
  const maxTokens = 2000;
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
        // structured JSON, so 2000 tokens is generous headroom.
        maxTokens,
      }),
    { onRetry }
  );
  settle(usage.totalTokens ?? maxTokens);
  return { plan: object, usage };
}
