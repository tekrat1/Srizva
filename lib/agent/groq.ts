import { createGroq } from "@ai-sdk/groq";

/**
 * Provider switch: set AI_PROVIDER=groq or AI_PROVIDER=cerebras in
 * .env.local to flip which backend the whole pipeline calls, without
 * touching code. Both use the same OpenAI-compatible chat-completions
 * shape, so the same @ai-sdk/groq client works for either - only the
 * baseURL, API key, and model id (and pacing budget, see rateLimiter.ts)
 * differ per provider.
 *
 * Why you'd switch:
 * - Groq: 30 RPM but only 8K TPM / 200K TPD on openai/gpt-oss-120b. Better
 *   when a build needs several small/QA-repair calls in quick succession
 *   (higher RPM), worse once a session's daily token quota gets eaten.
 * - Cerebras: 30K TPM / 1M TPD (uncached) on the same model - 5x the
 *   daily headroom - but only 5 RPM / 2400 RPD, so it paces slower on
 *   builds with several files.
 * Defaults to Cerebras since that's the current bottleneck being solved
 * (daily quota), but flip back to Groq any time by changing AI_PROVIDER.
 */
type Provider = "groq" | "cerebras";

const PROVIDER: Provider = (process.env.AI_PROVIDER?.toLowerCase() as Provider) || "cerebras";

const PROVIDER_CONFIG: Record<Provider, { baseURL?: string; apiKey: string | undefined; modelId: string; envVarName: string }> = {
  groq: {
    baseURL: undefined, // @ai-sdk/groq's own default (api.groq.com)
    apiKey: process.env.GROQ_API_KEY,
    modelId: "openai/gpt-oss-120b",
    envVarName: "GROQ_API_KEY",
  },
  cerebras: {
    baseURL: "https://api.cerebras.ai/v1",
    apiKey: process.env.CEREBRAS_API_KEY,
    modelId: "gpt-oss-120b",
    envVarName: "CEREBRAS_API_KEY",
  },
};

const config = PROVIDER_CONFIG[PROVIDER];

if (!config.apiKey) {
  // Thrown lazily at call-time inside route handlers, not at import/build time.
  console.warn(`${config.envVarName} is not set (AI_PROVIDER=${PROVIDER}). Set it in .env.local`);
}

export const groq = createGroq({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
});

export const MODEL_ID = config.modelId;
export const AI_PROVIDER = PROVIDER;
export const isProviderConfigured = Boolean(config.apiKey);
export const requiredEnvVarName = config.envVarName;
