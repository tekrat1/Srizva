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

/** Extracts the wait time Groq suggests, e.g. "try again in 16.0575s" -> 16057ms. */
function parseRetryAfterMs(message: string): number | null {
  const match = message.match(/try again in ([\d.]+)s/i);
  if (!match) return null;
  const seconds = parseFloat(match[1]);
  if (Number.isNaN(seconds)) return null;
  return Math.ceil(seconds * 1000);
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
      const waitMs = (parseRetryAfterMs(message) ?? fallbackDelayMs) + 500;
      onRetry?.(attempt + 1, waitMs, message);
      await sleep(waitMs);
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw lastErr;
}
