/**
 * Groq's on-demand tier enforces a tokens-per-minute (TPM) cap (e.g. 8000
 * TPM for openai/gpt-oss-120b). Because the agent pipeline fires several
 * large calls back-to-back (planner -> architect -> one coder call per
 * file), it's easy to blow past that cap within a single minute even
 * though each individual call is well within the model's context limit.
 *
 * The Vercel AI SDK's built-in retry (default: 2 retries) retries almost
 * immediately, which does nothing for a per-minute limit - you need to
 * actually wait out the window. Groq's 429 error body includes how long
 * to wait (e.g. "Please try again in 16.0575s"), so we parse that and
 * sleep for it instead of guessing.
 */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts the wait time Groq suggests. Groq formats this differently
 * depending on the limit that tripped:
 *  - per-minute (TPM/RPM): "try again in 16.0575s"
 *  - per-day (TPD/RPD), which is usually a much longer wait: "try again in
 *    14m14.927999999s", or even "1h2m3s" for very depleted daily quotas.
 * The old version only matched the plain-seconds form, so any multi-minute
 * wait (i.e. almost every TPD error) silently failed to parse and fell
 * back to a useless multi-second retry - which just burns more of an
 * already-exhausted daily quota for no benefit and gets nothing but
 * repeat 429s until maxRetries gives up.
 */
function headerValue(headers: unknown, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();

  if (typeof headers === "object") {
    const h = headers as {
      get?: (key: string) => string | null;
      [key: string]: unknown;
    };

    if (typeof h.get === "function") {
      const value = h.get(name) ?? h.get(lower);
      if (value) return value;
    }

    for (const [key, value] of Object.entries(h)) {
      if (key.toLowerCase() === lower && typeof value === "string") return value;
    }
  }

  return null;
}

function errorHeaders(err: unknown): unknown[] {
  if (!err || typeof err !== "object") return [];
  const e = err as {
    headers?: unknown;
    responseHeaders?: unknown;
    response?: { headers?: unknown };
    cause?: { headers?: unknown; response?: { headers?: unknown } };
  };

  return [
    e.headers,
    e.responseHeaders,
    e.response?.headers,
    e.cause?.headers,
    e.cause?.response?.headers,
  ].filter(Boolean);
}

/**
 * Prefer the provider's machine-readable retry/reset headers. Groq exposes
 * retry-after plus x-ratelimit-reset-tokens; the latter is available even
 * before a 429 and is much more reliable than guessing from an error string.
 */
function parseRetryAfterMs(err: unknown, message: string): number | null {
  for (const headers of errorHeaders(err)) {
    const retryAfter = headerValue(headers, "retry-after");
    if (retryAfter) {
      const seconds = Number.parseFloat(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.ceil(seconds * 1000);
      }
    }

    const resetTokens = headerValue(headers, "x-ratelimit-reset-tokens");
    if (resetTokens) {
      const match = resetTokens.match(
        /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i
      );
      if (match) {
        const hours = Number(match[1] ?? 0);
        const minutes = Number(match[2] ?? 0);
        const seconds = Number(match[3] ?? 0);
        const total = hours * 3600 + minutes * 60 + seconds;
        if (total > 0) return Math.ceil(total * 1000);
      }
    }
  }

  const match = message.match(
    /try again in ((?:[\d.]+h)?(?:[\d.]+m)?[\d.]+s)/i
  );
  if (!match) return null;

  const span = match[1];
  const hours = parseFloat(span.match(/([\d.]+)h/)?.[1] ?? "0");
  const minutes = parseFloat(span.match(/([\d.]+)m/)?.[1] ?? "0");
  const seconds = parseFloat(span.match(/([\d.]+)s/)?.[1] ?? "0");
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  return Math.ceil(totalSeconds * 1000);
}

/** True for Groq's daily (TPD/RPD) caps specifically, as opposed to per-minute (TPM/RPM). */
function isDailyLimitError(message: string): boolean {
  return /tokens per day|requests per day|\bTPD\b|\bRPD\b/i.test(message);
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { message?: string; statusCode?: number; status?: number };
  const status = anyErr.statusCode ?? anyErr.status;
  const message = anyErr.message ?? String(err);
  return status === 429 || /rate limit/i.test(message);
}

export interface RetryOptions {
  maxRetries?: number;
  /** Fallback wait if Groq's error doesn't include a parseable wait time. */
  fallbackDelayMs?: number;
  onRetry?: (attempt: number, waitMs: number, message: string) => void;
}

/**
 * Runs `fn`, retrying with the wait time Groq's rate-limit error tells us
 * to use. Only retries on rate-limit errors - anything else is rethrown
 * immediately.
 */
export async function withGroqRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 5, fallbackDelayMs = 5000, onRetry } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === maxRetries) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      // Add a small buffer on top of Groq's suggested wait so we don't
      // race the window boundary.
      const waitMs = (parseRetryAfterMs(err, message) ?? fallbackDelayMs) + 500;

      // A daily (TPD/RPD) cap means retrying within this request won't
      // help - the suggested wait is usually minutes to hours, way past
      // any serverless function timeout, and every extra attempt just
      // burns more of the little quota that might be left. Surface it
      // immediately with the real wait time instead of silently spinning
      // through maxRetries on a fallback delay that can never succeed.
      if (isDailyLimitError(message)) {
        const minutes = Math.ceil(waitMs / 60000);
        throw new Error(
          `Groq's daily token limit for this model is used up for today. Try again in about ${minutes} minute(s), or upgrade at console.groq.com/settings/billing for a higher daily cap.`
        );
      }

      onRetry?.(attempt + 1, waitMs, message);
      await sleep(waitMs);
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw lastErr;
}
