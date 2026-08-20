# Srizva Multi-Provider Fallback

Srizva now keeps one LangGraph task alive while switching providers when a configured provider fails.

Default order:

`Groq -> Gemini -> OpenRouter`

Environment variables:

```env
GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_MODEL=gemini-3.7-flash
OPENROUTER_MODEL=openrouter/free
SRIZVA_PROVIDER_ORDER=groq,gemini,openrouter
AI_REASONING_EFFORT=low
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A quota/rate-limit/model-availability error from Groq is not allowed to kill the current task. The fallback wrapper retries the same prompt/state with Gemini, then OpenRouter. Missing keys are skipped.

Gemini 2.5 Flash was removed from availability for the affected account; Srizva now defaults to `gemini-3.7-flash`, matching Google's current migration guidance.

Install after pulling the changes:

```bash
npm install
npm run build
```
