
import { generateObjectWithFallback, type AIProviderName } from "./groq";
import { TaskPlanSchema, type TaskPlan, type Plan, type CallUsage } from "./types";
import { architectPrompt } from "./prompts";
import { type RetryOptions } from "./retry";
import { clampTokenBudget } from "./rateLimiter";

export async function runArchitect(
  plan: Plan,
  onRetry?: RetryOptions["onRetry"],
  preferredProvider?: AIProviderName | null
): Promise<{ taskPlan: TaskPlan; usage: CallUsage; providerUsed: AIProviderName }> {
  const prompt = architectPrompt(JSON.stringify(plan, null, 2));
  // Scaled to the plan's actual file count instead of a flat 3000: a
  // 1-file plan doesn't need the same reserved budget as a 10-file one,
  // and that reservation is charged against the TPM cap before the call
  // even runs (see rateLimiter.ts) - a flat worst-case number here was
  // the single biggest reason small projects queued behind an
  // unnecessarily large reservation.
  const maxTokens = clampTokenBudget(400 + plan.files.length * 220, 600, 2400);
  // Provider fallback owns rate-limit handling.
  const settle = (_actualTokens?: number) => {};

  const { object, usage, providerUsed } = await generateObjectWithFallback({
        schema: TaskPlanSchema,
        prompt,
        // See planner.ts for why this cap matters: it's counted toward
        // Groq's TPM limit up front, not just actual usage. Scaled by file
        // count above so a task list (one short entry per file) still fits
        // comfortably even for larger projects.
        maxTokens,
      }, preferredProvider);
  settle(usage.totalTokens ?? maxTokens);
  return { taskPlan: object, usage, providerUsed };
}
