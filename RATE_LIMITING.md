# Srizva AI rate-limit handling

Srizva now treats provider rate limits as a scheduling problem instead of a fatal generation error.

## What happens during a build

1. Every LLM request estimates prompt + completion tokens.
2. A global in-process token bucket reserves the request before sending it.
3. The bucket uses a safety margin (`SRIZVA_TPM_SAFETY_RATIO`, default `0.85`) so tokenization/usage variance does not immediately cross the provider limit.
4. If the next request would exceed the safe TPM window, Srizva waits and emits a progress event. Generation then continues automatically.
5. If the provider still returns HTTP 429 (for example because another server instance used the same API key), the retry layer uses `retry-after` / `x-ratelimit-reset-tokens` when available and waits before retrying.
6. Daily limits are surfaced as a clear error instead of repeatedly retrying an exhausted quota.

## Environment variables

```env
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_TPM_LIMIT=8000
GROQ_RPM_LIMIT=30
SRIZVA_TPM_SAFETY_RATIO=0.85
AI_REASONING_EFFORT=low
```

`GROQ_TPM_LIMIT` and `GROQ_RPM_LIMIT` should match the limits shown for the API organization/project. Do not increase these values unless the provider account actually has the higher limit.

## Important

A rate limiter cannot create additional provider quota. If a build needs 25K tokens and the account allows only 8K TPM, the build must take multiple rate-limit windows. Srizva now waits and resumes instead of failing halfway through.

For horizontally scaled deployments, the in-memory limiter is only a local first line of defense. The provider's 429/reset headers remain authoritative; a shared Redis/Upstash limiter can be added later if many server instances share one API key.
