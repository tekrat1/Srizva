import { createGroq } from "@ai-sdk/groq";

if (!process.env.GROQ_API_KEY) {
  // Thrown lazily at call-time inside route handlers, not at import/build time.
  console.warn("GROQ_API_KEY is not set. Set it in .env.local");
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Same model coder-buddy used. Swap here if you want a different Groq model.
export const MODEL_ID = "openai/gpt-oss-120b";
