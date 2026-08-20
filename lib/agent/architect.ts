import { generateObject } from "ai";
import { groq, MODEL_ID } from "./groq";
import { TaskPlanSchema, type TaskPlan, type Plan, type CallUsage } from "./types";
import { architectPrompt } from "./prompts";
import { withGroqRetry, type RetryOptions } from "./retry";
import { reserveGroqBudget, estimateTokens } from "./rateLimiter";

export async function runArchitect(
  plan: Plan,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ taskPlan: TaskPlan; usage: CallUsage }> {
  const prompt = architectPrompt(JSON.stringify(plan, null, 2));
  const maxTokens = 3000;
  const settle = await reserveGroqBudget(estimateTokens(prompt) + maxTokens);

  const { object, usage } = await withGroqRetry(
    () =>
      generateObject({
        model: groq(MODEL_ID),
        schema: TaskPlanSchema,
        prompt,
        // See planner.ts for why this cap matters: it's counted toward
        // Groq's TPM limit up front, not just actual usage. A task list
        // (one short entry per file) fits comfortably in 3000 tokens even
        // for larger projects.
        maxTokens,
      }),
    { onRetry }
  );
  settle(usage.totalTokens ?? maxTokens);
  return { taskPlan: object, usage };
}
