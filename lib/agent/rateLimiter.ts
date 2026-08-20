/**
 * Provider-aware sliding-window rate limiter for Srizva.
 *
 * Groq enforces organization-level RPM/TPM (and on some accounts separate
 * input/output limits). A multi-agent build can otherwise spend most of the
 * minute's allowance in one request and then get a 429 halfway through the
 * next file.
 *
 * This limiter:
 * - reserves budget BEFORE every LLM call;
 * - uses a safety margin so estimation error does not cross the provider cap;
 * - queues concurrent calls in this Node process;
 * - waits for the oldest reservation to expire instead of firing a request
 *   that is guaranteed to 429;
 * - emits a wait callback so the UI can show "waiting for rate limit" rather
 *   than looking stuck;
 * - never waits forever when one call cannot fit inside the configured TPM.
 *
 * IMPORTANT: this protects one server process. For horizontally scaled
 * deployments, the provider's own 429/retry headers remain the final source
 * of truth. The retry layer handles those too.
 */

import { AI_PROVIDER } from "./groq";

function envNumber(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULTS = {
  // Current Groq free-plan base limit for GPT-OSS models is 8K TPM.
  // Keep this configurable because the exact organization limit can differ.
  groq: { tpm: 8000, rpm: 30 },
  // Conservative fallback for optional Cerebras usage. Override with env.
  cerebras: { tpm: 30000, rpm: 5 },
} as const;

const providerDefaults = DEFAULTS.groq; // Groq is the only provider with a local TPM reservation model; fallbacks use provider-side limits.
const TPM_LIMIT = envNumber(process.env.GROQ_TPM_LIMIT, providerDefaults.tpm);
const RPM_LIMIT = envNumber(process.env.GROQ_RPM_LIMIT, providerDefaults.rpm);
const SAFETY_RATIO = Math.min(
  0.98,
  Math.max(0.60, envNumber(process.env.SRIZVA_TPM_SAFETY_RATIO, 0.85))
);
const EFFECTIVE_TPM_LIMIT = Math.max(1, Math.floor(TPM_LIMIT * SAFETY_RATIO));
const WINDOW_MS = 60_000;

interface LogEntry {
  /** Reserved token budget for this call. */
  tokens: number;
  at: number;
}

const usageLog: LogEntry[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneOld(now: number) {
  while (usageLog.length && now - usageLog[0].at >= WINDOW_MS) {
    usageLog.shift();
  }
}

function tokensInWindow(now: number): number {
  pruneOld(now);
  return usageLog.reduce((sum, e) => sum + e.tokens, 0);
}

export interface ReserveOptions {
  onWait?: (waitMs: number, usedTokens: number, limitTokens: number) => void;
}

/**
 * Reserve a slot for an estimated request.
 *
 * `estimatedTokens` should include prompt + requested completion budget.
 * The reservation is intentionally conservative. Once the call completes,
 * `settle()` replaces the reservation with actual usage.
 */
export async function reserveGroqBudget(
  estimatedTokens: number,
  options: ReserveOptions = {}
): Promise<(actualTokens: number) => void> {
  const estimate = Math.max(1, Math.ceil(estimatedTokens));

  // IMPORTANT: this reservation is only a local Groq optimization. The actual
  // provider is selected later by generateTextWithFallback/generateObjectWithFallback.
  // Never hard-fail the whole generation here just because a Groq-safe budget
  // is too small: Groq may be exhausted/unavailable and the same task may
  // legitimately continue on Gemini or OpenRouter. A hard pre-provider error
  // used to kill the fallback chain (for example at ~7,032 tokens vs 6,800).
  // Let the provider router decide. If the request is larger than the local
  // safe window, skip the local reservation and allow the selected provider
  // to accept or reject it.
  if (estimate > EFFECTIVE_TPM_LIMIT) {
    console.warn(
      `[Srizva] estimated request ${estimate.toLocaleString()} tokens exceeds the local Groq safe window ` +
      `(${EFFECTIVE_TPM_LIMIT.toLocaleString()}); skipping local Groq reservation so provider fallback can continue.`
    );
    return () => {};
  }

  for (;;) {
    const now = Date.now();
    const used = tokensInWindow(now);
    const overTokens = used + estimate > EFFECTIVE_TPM_LIMIT;
    const overRequests = usageLog.length + 1 > RPM_LIMIT;

    if (!overTokens && !overRequests) {
      const entry: LogEntry = { tokens: estimate, at: now };
      usageLog.push(entry);

      return (actualTokens: number) => {
        // Never allow the local reservation to under-report a call. If the
        // provider reports more usage than estimated, keep the larger value
        // until it ages out of the window.
        entry.tokens = Math.max(1, Math.ceil(actualTokens || estimate));
      };
    }

    const oldest = usageLog[0];
    const waitForTokens = overTokens && oldest
      ? Math.max(250, WINDOW_MS - (now - oldest.at) + 250)
      : 0;
    const waitForRequests = overRequests && oldest
      ? Math.max(250, WINDOW_MS - (now - oldest.at) + 250)
      : 0;
    const waitMs = Math.max(waitForTokens, waitForRequests, 500);

    options.onWait?.(waitMs, used, EFFECTIVE_TPM_LIMIT);
    await sleep(waitMs);
  }
}

/**
 * Conservative code token estimate. Code tends to tokenize less efficiently
 * than normal English, so 3 chars/token is safer than the old 4 chars/token
 * estimate when reserving a hard provider limit.
 */
export function estimateTokens(...texts: (string | undefined | null)[]): number {
  return Math.max(
    1,
    Math.ceil(texts.reduce((sum, t) => sum + (t?.length ?? 0), 0) / 3)
  );
}

export function clampTokenBudget(
  estimate: number,
  floor: number,
  ceiling: number
): number {
  return Math.max(floor, Math.min(ceiling, Math.round(estimate)));
}

export function getRateLimitConfig() {
  return {
    provider: AI_PROVIDER,
    tpmLimit: TPM_LIMIT,
    rpmLimit: RPM_LIMIT,
    safetyRatio: SAFETY_RATIO,
    effectiveTpmLimit: EFFECTIVE_TPM_LIMIT,
  };
}
