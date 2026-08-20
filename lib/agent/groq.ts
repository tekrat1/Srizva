import { createGroq } from "@ai-sdk/groq";

if (!process.env.GROQ_API_KEY) {
  // Thrown lazily at call-time inside route handlers, not at import/build time.
  console.warn("GROQ_API_KEY is not set. Set it in .env.local");
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Was openai/gpt-oss-120b (8K TPM, 200K TPD on the free tier - see
// console.groq.com/settings/limits). Switched to compound-mini: same free
// account, but 70K TPM (~9x) and no daily token cap at all, per the org's
// Current Limits page. Compound models run on Groq's own agentic stack
// (tool-use built in) but work fine as a plain chat-completions swap for
// generateText/generateObject - no code changes needed elsewhere.
// If output quality/behavior differs from gpt-oss-120b, swap back or try
// "groq/compound" (same limits, slightly heavier model).
export const MODEL_ID = "groq/compound-mini";
