/**
 * Approximate $/1M-token pricing, used only to render an illustrative cost
 * estimate on the usage dashboard. This is NOT wired to live billing data
 * and won't track Groq's actual rates if they change - treat it as a
 * ballpark, not an invoice. Check console.groq.com/pricing for current
 * numbers and adjust here if you want the estimate to stay accurate.
 */
const PRICE_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.75 },
};

/** Returns a rough USD cost estimate for a call, or null if the model isn't in the table. */
export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number | null {
  const price = PRICE_PER_1M_TOKENS[model];
  if (!price) return null;
  return (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;
}

export function formatCostUsd(usd: number): string {
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(2)}`;
}
