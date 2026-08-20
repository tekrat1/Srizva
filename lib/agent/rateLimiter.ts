/**
 * Proactive sliding-window budget for Groq's rate limits (TPM + RPM).
 *
 * The old approach was a flat 1500ms sleep between files, then just firing
 * the next call and letting withGroqRetry (see retry.ts) eat a full 429
 * backoff (5-16s+, per Groq's own suggested wait) whenever that guess was
 * wrong. On the free/on-demand tier (8000 TPM for openai/gpt-oss-120b as
 * of mid-2026 - see console.groq.com/docs/rate-limits for current
 * numbers), a single coder call's system prompt + context + completion
 * budget is often already close to the entire per-minute cap, so that
 * guess was wrong on a lot of files - the 429 retries, not the
 * intentional pacing, were the dominant cost of a "slow" build.
 *
 * This tracks actual token/request usage in a trailing 60s window and, before
 * firing a call, waits only as long as it takes for enough of that window to
 * age out to fit the call - zero wait when there's headroom, and never a
 * wasted round trip that was always going to 429.
 *
 * Configurable via env so this scales with your actual Groq tier instead of
 * assuming everyone is on the free tier forever - see .env.local.example.
 */

import { AI_PROVIDER } from "./groq";

// .env.local.example ships these keys BLANK (e.g. "GROQ_TPM_LIMIT="). If that
// line is left as-is, process.env.GROQ_TPM_LIMIT is "" - not undefined - so
// the "?? 8000" fallback never kicks in and Number("") silently evaluates to
// 0. A 0 budget means every single call looks "over budget" forever, so
// reserveGroqBudget() spins in its wait loop indefinitely. Guard explicitly
// against "", so a blank/unset env var always falls back to the tier default.
function envNumber(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Per-provider free-tier defaults for openai/gpt-oss-120b (see groq.ts for
// the full comparison). GROQ_TPM_LIMIT/GROQ_RPM_LIMIT env vars still
// override either provider's default directly, if you know your account's
// real numbers differ (e.g. a paid tier on either side).
const DEFAULTS = {
  groq: { tpm: 8000, rpm: 30 },
  cerebras: { tpm: 30000, rpm: 5 },
} as const;
const providerDefaults = DEFAULTS[AI_PROVIDER];

const TPM_LIMIT = envNumber(process.env.GROQ_TPM_LIMIT, providerDefaults.tpm);
const RPM_LIMIT = envNumber(process.env.GROQ_RPM_LIMIT, providerDefaults.rpm);
const WINDOW_MS = 60_000;

interface LogEntry {
  tokens: number;
  at: number;
}

// Module-level (per server process) - intentionally not per-request, since
// the limit is enforced by Groq at the organization/API-key level, not per
// user session.
const usageLog: LogEntry[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneOld(now: number) {
  while (usageLog.length && now - usageLog[0].at > WINDOW_MS) usageLog.shift();
}

function tokensInWindow(now: number): number {
  pruneOld(now);
  return usageLog.reduce((sum, e) => sum + e.tokens, 0);
}

/**
 * Waits until firing a call estimated at `estimatedTokens` won't exceed
 * either the TPM or RPM budget in the trailing 60s window, then reserves
 * the slot immediately (so back-to-back calls queue correctly instead of
 * all passing the check at once).
 *
 * Returns a `settle` function - call it with the call's real total token
 * usage once the request completes, so the reservation reflects what
 * actually happened rather than the pre-call estimate.
 */
export async function reserveGroqBudget(
  estimatedTokens: number
): Promise<(actualTokens: number) => void> {
  for (;;) {
    const now = Date.now();
    const used = tokensInWindow(now);
    const overTokens = used + estimatedTokens > TPM_LIMIT;
    const overRequests = usageLog.length + 1 > RPM_LIMIT;

    if (!overTokens && !overRequests) {
      const entry: LogEntry = { tokens: estimatedTokens, at: now };
      usageLog.push(entry);
      return (actualTokens: number) => {
        entry.tokens = actualTokens;
      };
    }

    // Wait until the oldest entry ages out of the window, plus a small
    // buffer so we don't race the boundary.
    const oldest = usageLog[0];
    const waitMs = oldest ? Math.max(0, WINDOW_MS - (now - oldest.at)) + 150 : 1000;
    await sleep(waitMs);
  }
}

/** ~4 chars/token is the same conservative estimate already used elsewhere (coder.ts, edit.ts). */
export function estimateTokens(...texts: (string | undefined | null)[]): number {
  return Math.ceil(texts.reduce((sum, t) => sum + (t?.length ?? 0), 0) / 4);
}

/**
 * Clamps a token estimate between a floor and a ceiling.
 *
 * reserveGroqBudget() above charges a call's `maxTokens` against the TPM
 * cap up front, before the real completion length is known - so a flat
 * worst-case `maxTokens` on every call (regardless of how small the
 * actual task is) reserves way more budget than it needs, and that
 * over-reservation is what forces later calls to sit out a big chunk of
 * the 60s window even on a trivially small project. Call sites use this
 * to size `maxTokens` to the task at hand instead: small tasks reserve a
 * small slot (and finish fast), big tasks still get the full ceiling.
 */
export function clampTokenBudget(estimate: number, floor: number, ceiling: number): number {
  return Math.max(floor, Math.min(ceiling, Math.round(estimate)));
}
