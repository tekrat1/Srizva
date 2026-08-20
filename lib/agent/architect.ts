import { generateObject } from "ai";
import { groq, MODEL_ID } from "./groq";
import { TaskPlanSchema, type TaskPlan, type Plan, type CallUsage } from "./types";
import { architectPrompt } from "./prompts";
import { withGroqRetry, type RetryOptions } from "./retry";
import { reserveGroqBudget, estimateTokens, clampTokenBudget } from "./rateLimiter";

export async function runArchitect(
  plan: Plan,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ taskPlan: TaskPlan; usage: CallUsage }> {
  const prompt = architectPrompt(JSON.stringify(plan, null, 2));
  // Scaled to the plan's actual file count instead of a flat 3000: a
  // 1-file plan doesn't need the same reserved budget as a 10-file one,
  // and that reservation is charged against the TPM cap before the call
  // even runs (see rateLimiter.ts) - a flat worst-case number here was
  // the single biggest reason small projects queued behind an
  // unnecessarily large reservation.
  const maxTokens = clampTokenBudget(500 + plan.files.length * 260, 800, 3000);
  const settle = await reserveGroqBudget(estimateTokens(prompt) + maxTokens);

  const { object, usage } = await withGroqRetry(
    () =>
      generateObject({
        model: groq(MODEL_ID),
        schema: TaskPlanSchema,
        prompt,
        // See planner.ts for why this cap matters: it's counted toward
        // Groq's TPM limit up front, not just actual usage. Scaled by file
        // count above so a task list (one short entry per file) still fits
        // comfortably even for larger projects.
        maxTokens,
      }),
    { onRetry }
  );
  settle(usage.totalTokens ?? maxTokens);
  return { taskPlan: object, usage };
}
