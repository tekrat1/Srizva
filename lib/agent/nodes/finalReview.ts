import { generateObject } from "ai";
import { groq, MODEL_ID } from "../groq";
import { z } from "zod";
import { reserveGroqBudget, estimateTokens, clampTokenBudget } from "../rateLimiter";
import { withGroqRetry, type RetryOptions } from "../retry";
import type { Plan, VirtualFS, CallUsage } from "../types";

export const FinalReviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    path: z.string(),
    message: z.string(),
  })),
});

export async function runFinalReview(
  plan: Plan,
  files: VirtualFS,
  onRetry?: RetryOptions["onRetry"]
): Promise<{ passed: boolean; issues: { path: string; message: string }[]; usage?: CallUsage }> {
  const chunks: string[] = [];
  let used = 0;
  for (const [path, content] of Object.entries(files)) {
    const chunk = `FILE: ${path}\n${content.slice(0, 500)}`;
    if (used + chunk.length > 5500) break;
    chunks.push(chunk);
    used += chunk.length;
  }
  const manifest = chunks.join("\n\n");
  const prompt = `You are Srizva's final software reviewer.
Review whether this generated project satisfies the original plan.
Focus on integration mistakes, missing functionality, broken references, inconsistent selectors/APIs, placeholders, and obvious bugs.
Do not request changes for subjective style preferences.
Return only structured JSON.

PLAN:
${JSON.stringify(plan)}

PROJECT:
${manifest}`;

  const maxTokens = clampTokenBudget(500 + Object.keys(files).length * 40, 600, 1000);
  const settle = await reserveGroqBudget(estimateTokens(prompt) + maxTokens);

  try {
    const { object, usage } = await withGroqRetry(
      () => generateObject({
        model: groq(MODEL_ID),
        schema: FinalReviewSchema,
        prompt,
        maxTokens,
      }),
      { onRetry }
    );
    settle(usage.totalTokens ?? maxTokens);
    return { ...object, usage };
  } catch (error) {
    // Final review is a quality enhancement, not a reason to discard a
    // project that already passed deterministic validation.
    settle(0);
    console.warn("[finalReview] skipped:", error);
    return { passed: true, issues: [] };
  }
}
