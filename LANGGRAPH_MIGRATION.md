# Srizva LangGraph migration

Srizva now uses LangGraph as the orchestration/state layer while retaining the existing Vercel AI SDK + provider adapters.

## Install

Run:

```bash
npm install
```

This installs the current LangGraph packages declared in `package.json`.

## Generation graph

Requirements → Planner → Architect → Context Selection → Coder → QA → Repair loop → Project Validation → Final Agent Review → Done.

The graph uses an in-memory LangGraph checkpointer for fault-tolerant execution within a running server process. Production deployments should replace it with a persistent checkpointer (Postgres/SQLite/etc.) when cross-instance resume is required.

## Token efficiency

The graph does not increase provider token quotas. It reduces unnecessary usage by selecting dependency-aware context, limiting completion budgets, repairing only affected files, avoiding full-project regeneration, and tracking usage.

## Runtime/build verification

The current generated-project environment is intentionally static HTML/CSS/JS, so server-side generation does not execute arbitrary generated code. Project-wide validation checks structure and local references. Browser/WebContainer execution remains the client-side preview path.

## Post-implementation review fix

A review pass found that the generation graph's `context` node computed
dependency-aware context (`nodes/context.ts`) but the `coder` node never
passed it to `runCoderForFile`, which silently fell back to its own
"most-recent files, budget-capped" selection instead. `coder.ts` now
accepts a `precomputedContext` param and `graph.ts` passes
`state.relevantContext` into it, so the Context Agent's ranked selection
is actually used for fresh generation (it was already wired correctly on
the edit-graph path). No other correctness issues were found in the
LangGraph wiring on review; dependency versions (`@langchain/langgraph`,
`@langchain/langgraph-checkpoint`) were checked against their current
published releases.

## Fix: Annotation `value` requirement (post-`npm install` build failure)

A live `npx tsc --noEmit` / `next build` run against the real installed
`@langchain/langgraph` package surfaced 36 type errors, all in
`lib/agent/graph/state.ts` and the two `app.invoke({...})` calls that
depend on its inferred types. The installed package's `Annotation<T>()`
options type requires an explicit `value` (a `BinaryOperator<V, U>`
reducer) - `default` alone is no longer sufficient. `state.ts` now passes
a shared `overwrite` reducer (`(_, update) => update`) as `value` on
every field, which matches the last-write-wins behavior the graph nodes
already assumed (every node returns the complete new value for any field
it touches - `files`, `changes`, `completedTasks`, etc. - rather than a
partial to be merged). This single change resolves all 36 reported
errors, since the `app.invoke({...})` type errors were downstream of the
same broken type inference, not separate issues.


## Generation truncation / preview reliability fix

The coder now treats the model provider's `finishReason === "length"` as a real QA failure instead of discarding it. Completion budgets are sized from file type and existing file size rather than task-description length alone, and a length-terminated response gets one larger-budget regeneration. JavaScript QA also detects common semantically incomplete endings such as unfinished DOM API calls. This prevents truncated files from reaching the live preview.

The ZIP download action was also hardened with explicit browser download handling, cleanup, duplicate-click protection, and empty-project protection.
