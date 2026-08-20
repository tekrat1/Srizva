import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, type LanguageModelV1 } from "ai";

/**
 * Local option types for the two wrapper functions below.
 *
 * NOTE: `generateObject`/`generateText` from the `ai` SDK are overloaded
 * (schema / no-schema / array / enum output modes for generateObject).
 * TypeScript's `Parameters<T>` utility only resolves to the LAST overload
 * signature for an overloaded function, so typing these wrappers'
 * `options` param as `Parameters<typeof generateObject>[0]` silently
 * picked the "no-schema" overload - which doesn't have a `schema` field,
 * and doesn't require `model` since that overload expects it directly.
 * That produced `tsc`/`next build` type errors at every call site (schema
 * "unknown property", missing `model`) even though the code runs fine at
 * runtime. These explicit, permissive option types describe what these
 * wrappers actually accept, and the SDK call itself is the single place
 * that asserts the final shape.
 */
type GenerateTextFallbackOptions = {
  system?: string;
  prompt: string;
  maxTokens?: number;
} & Record<string, unknown>;

type GenerateObjectFallbackOptions = {
  schema: unknown;
  prompt: string;
  maxTokens?: number;
} & Record<string, unknown>;

/**
 * Srizva multi-provider model router.
 * Primary: Groq. Fallbacks: Gemini, then OpenRouter.
 * A provider is skipped when its key is missing. Quota/rate-limit/model
 * errors move to the next provider without restarting the LangGraph task.
 */
export type AIProviderName = "groq" | "gemini" | "openrouter";

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

// Keep known retired Gemini model IDs from .env.local from overriding the
// current default. Users who already have GEMINI_MODEL=gemini-2.5-flash or
// gemini-3.6-flash should migrate automatically to the current stable model.
const requestedGeminiModel = process.env.GEMINI_MODEL?.trim();
const retiredGeminiModels = new Set(["gemini-2.5-flash", "gemini-2.5-flash-latest", "gemini-3.6-flash"]);
const geminiModelId = requestedGeminiModel && !retiredGeminiModels.has(requestedGeminiModel)
  ? requestedGeminiModel
  : "gemini-3.7-flash";

export const PROVIDER_ORDER: AIProviderName[] =
  (process.env.SRIZVA_PROVIDER_ORDER || "groq,gemini,openrouter")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x): x is AIProviderName => ["groq", "gemini", "openrouter"].includes(x));

const groq = createGroq({ apiKey: groqKey });
const google = createGoogleGenerativeAI({ apiKey: geminiKey });
const openrouter = createOpenAI({
  apiKey: openrouterKey,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Srizva",
  },
});

export const PROVIDER_CONFIG: Record<AIProviderName, { modelId: string; configured: boolean }> = {
  groq: { modelId: "openai/gpt-oss-120b", configured: Boolean(groqKey) },
  // Current stable Gemini Flash model for coding/agentic workflows.
  gemini: { modelId: geminiModelId, configured: Boolean(geminiKey) },
  // OpenRouter's free router chooses an available free model.
  openrouter: { modelId: process.env.OPENROUTER_MODEL || "openrouter/free", configured: Boolean(openrouterKey) },
};

export const MODEL_ID = PROVIDER_CONFIG.groq.modelId;
export const AI_PROVIDER: AIProviderName | "auto" = "auto";
export const isProviderConfigured = Boolean(groqKey || geminiKey || openrouterKey);
export const requiredEnvVarName = "GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY";

const configuredReasoning = (process.env.AI_REASONING_EFFORT || "low").toLowerCase();
export const REASONING_EFFORT: "low" | "medium" | "high" =
  configuredReasoning === "high" ? "high" : configuredReasoning === "medium" ? "medium" : "low";

export const AI_PROVIDER_OPTIONS = {
  groq: { reasoningEffort: REASONING_EFFORT },
};

// Make missing fallback credentials immediately visible instead of silently
// ending after Gemini. This is especially important when Groq is exhausted.
const configuredProviders = PROVIDER_ORDER.filter((provider) => PROVIDER_CONFIG[provider].configured);
console.info(
  `[Srizva] AI providers: ${configuredProviders.length ? configuredProviders.join(" → ") : "NONE"}. ` +
  `Fallback keys configured: ${configuredProviders.length}/3`
);
if (!PROVIDER_CONFIG.openrouter.configured) {
  console.warn("[Srizva] OpenRouter fallback is NOT configured. Add OPENROUTER_API_KEY to .env.local.");
}

function modelFor(provider: AIProviderName): LanguageModelV1 {
  switch (provider) {
    case "gemini": return google(PROVIDER_CONFIG.gemini.modelId);
    case "openrouter": return openrouter.chat(PROVIDER_CONFIG.openrouter.modelId);
    default: return groq(PROVIDER_CONFIG.groq.modelId);
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function providerErrorMessage(provider: AIProviderName, error: unknown): string {
  const message = errorText(error);
  return `[${provider}] ${message}`;
}

function isDailyQuotaExhausted(error: unknown): boolean {
  const message = errorText(error);
  return /tokens per day|requests per day|TPD|RPD|daily token limit|daily quota|quota.*exhausted/i.test(message);
}

function isRetryableProviderFailure(error: unknown): boolean {
  const message = errorText(error);
  return /rate limit|429|quota|resource exhausted|temporarily unavailable|high demand|overloaded|timeout|5\d\d/i.test(message);
}

/**
 * These failures are provider-local and should immediately trip the
 * per-generation circuit breaker. The router must move on rather than
 * repeatedly retrying the same provider.
 */
function providerShouldFailFast(error: unknown): boolean {
  const message = errorText(error);
  return (
    isDailyQuotaExhausted(error) ||
    /\b429\b|rate limit|resource exhausted|temporarily unavailable|high demand|overloaded|\b5\d\d\b/i.test(message)
  );
}

/**
 * Generate text with provider failover.
 *
 * IMPORTANT: a provider that has exhausted its daily quota is permanently
 * skipped for this generation request. We never retry it three times before
 * moving on, because that only wastes time and can make the whole graph look
 * stuck. The current task is retried against the next configured provider.
 */
/**
 * Orders providers so a previously-successful provider ("sticky") is tried
 * first, followed by the rest of PROVIDER_ORDER in their normal order
 * (minus the sticky one, which would otherwise be duplicated).
 *
 * Without this, every single call (planner, architect, each file's coder
 * call, final review...) restarts at the front of PROVIDER_ORDER and
 * re-fails against Groq/Gemini before reaching OpenRouter again - which is
 * exactly the "Groq ❌ / Gemini ❌ / OpenRouter ✅" repeating on every task
 * seen in production logs.
 */
function effectiveOrder(preferredProvider?: AIProviderName | null): AIProviderName[] {
  if (!preferredProvider || !PROVIDER_CONFIG[preferredProvider].configured) return PROVIDER_ORDER;
  return [preferredProvider, ...PROVIDER_ORDER.filter((p) => p !== preferredProvider)];
}

export async function generateTextWithFallback(
  options: GenerateTextFallbackOptions,
  preferredProvider?: AIProviderName | null
) {
  let lastError: unknown;
  const failures: string[] = [];

  for (const provider of effectiveOrder(preferredProvider)) {
    if (!PROVIDER_CONFIG[provider].configured) {
      console.warn(`[Srizva] ${provider} not configured; skipping provider`);
      continue;
    }

    try {
      const result = await generateText({
        ...options,
        // Provider fallback owns retrying. The AI SDK's default retries can
        // otherwise spend 2 extra attempts on the SAME unavailable provider
        // (e.g. Gemini 503/high-demand) before we ever reach the next one.
        // Fail fast here so one provider gets one attempt per task.
        maxRetries: 0,
        model: modelFor(provider),
        providerOptions: provider === "groq" ? AI_PROVIDER_OPTIONS : undefined,
      } as Parameters<typeof generateText>[0]);
      if (provider !== PROVIDER_ORDER[0]) {
        console.info(`[Srizva] provider switched to ${provider}; continuing current task`);
      }
      return { ...result, providerUsed: provider };
    } catch (error) {
      lastError = error;
      const msg = providerErrorMessage(provider, error);
      failures.push(msg);
      if (isDailyQuotaExhausted(error)) {
        console.warn(`[Srizva] ${provider} daily quota exhausted; circuit breaker open for this generation; skipping provider`);
        continue;
      }
      if (providerShouldFailFast(error) || isRetryableProviderFailure(error)) {
        console.warn(`[Srizva] ${provider} unavailable; circuit breaker open for this generation; switching immediately to next provider`, errorText(error));
        continue;
      }
      // A model/config/provider-specific error is also isolated to this
      // provider. Trying the next configured provider is safer than allowing
      // one provider to terminate the whole LangGraph task.
      console.warn(`[Srizva] ${provider} failed; switching immediately to next provider`, errorText(error));
    }
  }

  throw new Error(
    `All configured AI providers failed. ` +
    `Configure at least two providers for automatic failover.\n` +
    failures.join("\n") +
    (lastError ? `\nLast provider error: ${errorText(lastError)}` : "")
  );
}

/** Generate structured output with the same provider failover behavior. */
export async function generateObjectWithFallback(
  options: GenerateObjectFallbackOptions,
  preferredProvider?: AIProviderName | null
) {
  let lastError: unknown;
  const failures: string[] = [];

  for (const provider of effectiveOrder(preferredProvider)) {
    if (!PROVIDER_CONFIG[provider].configured) {
      console.warn(`[Srizva] ${provider} not configured; skipping provider`);
      continue;
    }

    try {
      // Cast bypasses TS's overload-picking (see the option-type comment
      // above) - the actual shape passed at runtime always matches the
      // schema-output overload, which is all this wrapper is used for.
      const result = await (generateObject as any)({
        ...options,
        // Same fail-fast rule as generateTextWithFallback: do not let the
        // SDK retry an unavailable provider before the router can fail over.
        maxRetries: 0,
        model: modelFor(provider),
        providerOptions: provider === "groq" ? AI_PROVIDER_OPTIONS : undefined,
      });
      if (provider !== PROVIDER_ORDER[0]) {
        console.info(`[Srizva] provider switched to ${provider}; continuing current task`);
      }
      return { ...result, providerUsed: provider };
    } catch (error) {
      lastError = error;
      const msg = providerErrorMessage(provider, error);
      failures.push(msg);
      if (isDailyQuotaExhausted(error)) {
        console.warn(`[Srizva] ${provider} daily quota exhausted; circuit breaker open for this generation; skipping provider`);
        continue;
      }
      if (providerShouldFailFast(error) || isRetryableProviderFailure(error)) {
        console.warn(`[Srizva] ${provider} unavailable; circuit breaker open for this generation; switching immediately to next provider`, errorText(error));
        continue;
      }
      // A model/config/provider-specific error is also isolated to this
      // provider. Trying the next configured provider is safer than allowing
      // one provider to terminate the whole LangGraph task.
      console.warn(`[Srizva] ${provider} failed; switching immediately to next provider`, errorText(error));
    }
  }

  throw new Error(
    `All configured AI providers failed. ` +
    `Configure at least two providers for automatic failover.\n` +
    failures.join("\n") +
    (lastError ? `\nLast provider error: ${errorText(lastError)}` : "")
  );
}
