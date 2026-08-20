# Buildify

Describe a website in plain English. An AI agent plans it, breaks it into
build tasks, writes every file, and shows it running live — right in your
browser, no local setup needed.

Copyright © 2026 Tekrat Prajapati. All rights reserved. See `LICENSE`.

---

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Groq for the generation model, via the Vercel AI SDK
- Firebase Auth + Firestore for accounts and saved projects
- Zero-dependency `<iframe srcDoc>` for the live preview (runs entirely in the visitor's browser tab, no sandbox runtime, no licensing cost)
- JSZip for the "download as ZIP" export

## How generation works (`lib/agent/`)

Three sequential steps, each one Groq call (or one call per file for the
last step):

1. **`planner.ts`** — turns the prompt into a structured plan: project name, feature list, and the full list of files to create. Output is always constrained to plain HTML/CSS/JS (no build step, no npm packages) so every generated project can preview instantly.
2. **`architect.ts`** — breaks that file list into ordered, detailed implementation tasks so dependencies get built before the things that depend on them.
3. **`coder.ts`** — writes one file at a time, given its task plus relevant existing files for context, so imports/ids/names stay consistent across the project.
4. **`run.ts`** — runs all three in sequence and streams progress events to the client as it goes.

Generated files never touch the server's disk — they live in memory as a
simple `{ path: content }` map for the duration of the request and get
streamed straight to the browser. That keeps concurrent users fully
isolated from each other with no shared state to clean up.

## Live preview (`components/LivePreview.tsx`)

- The generated `index.html` has its local `<link rel="stylesheet">` and `<script src="...">` tags inlined with the matching file content from the in-memory file map (external CDN links/scripts are left as-is).

## Public share links

Toggling "Share" on a project (`components/ShareButton.tsx`) sets `isPublic: true` and a permanent random `shareId` on the project doc, and `/share/[shareId]` (no auth) renders a read-only `LivePreview` for anyone with the link via `getPublicProject`. This query filters on `shareId == ... AND isPublic == true`, so Firestore needs a composite index on the `projects` collection (`shareId` Ascending, `isPublic` Ascending) — already declared in `firestore.indexes.json` below.

## Firestore composite indexes

A few queries filter on one field and sort on another (`where(...).orderBy(...)`), which Firestore can't satisfy with its automatic single-field indexes — it needs a composite index created once per query shape. These are declared in `firestore.indexes.json`:

- `projects`: `userId` (asc) + `createdAt` (desc) — used by `listMyProjects()` (dashboard, `/usage`)
- `projects`: `shareId` (asc) + `isPublic` (asc) — used by `getPublicProject()` (`/share/[shareId]`)
- `build_stats`: `userId` (asc) + `createdAt` (desc) — used by `getMyStats()` (`/stats`)

Deploy them with the Firebase CLI:

```
firebase deploy --only firestore:indexes
```

Or, the first time a missing-index error shows up in the server logs, Firestore includes a direct console link that pre-fills and creates that specific index for you — either approach works, but `firestore.indexes.json` keeps them reproducible across environments instead of being created ad hoc by whoever hits the error first.
- The combined HTML is rendered via `<iframe srcDoc="...">`, sandboxed with `allow-scripts allow-forms allow-popups allow-modals`.
- No install step, no bundler, no sandbox runtime to boot — preview is effectively instant and runs entirely inside the visitor's own browser tab, never on your server.
- No third-party licensing involved at any usage scale — safe to run commercially.

---

## Build receipt, lifetime stats & badges

- `lib/water.ts` is the single source of truth for the water-usage joke constants (`BOTTLE_ML` = 500, `EDIT_ML` = 150) — both client components (`WaterBottle`, `ReceiptCard`) and server actions (`lib/actions/stats.ts`) import from here so the numbers never drift apart.
- After every generation, `lib/agent/run.ts` (and `lib/agent/edit.ts` for edits) accumulates real Groq token usage across every LLM call in the run — including QA-repair retries — and emits it as `usage: UsageTotals` on the `done` SSE event. `GenerationWorkbench.tsx` forwards this into `saveProject`/`updateProject` (`lib/actions/projects.ts`), which persists `tokensUsed`/`model`/`generationTimeMs` on the project doc and calls `recordBuildStat` (best-effort — a stats-write failure never fails the actual save).
- `ReceiptCard.tsx` renders the "Spotify Wrapped"-style shareable receipt (prompt, file count, build time, real model + token count, and the mL water joke) right after a fresh generation finishes, with Download and native `navigator.share` buttons.
- `lib/actions/stats.ts` maintains one `user_stats/{uid}` doc per user (lifetime mL, total builds/generates/edits/files, UTC-day build streak, longest streak, earned badge ids) plus a bounded `build_stats` history collection (most recent 50 builds kept, older ones pruned) for the "recent activity" table on `/stats`.
  - **Firestore composite index needed**: `build_stats` collection, `userId` Ascending + `createdAt` Descending — used both by the recent-activity query and by the pruning query. Firestore will show a "create index" link in the server console the first time a build completes; click it, or add the index in `firestore.indexes.json` if you manage indexes as code.
  - Streak logic: same UTC day = no change, exactly one day later = streak+1, any bigger gap = streak resets to 1.
  - 7 badges (`computeBadges()`): First Sip, Efficient Sipper (<20s build), Chugged the Whole Bottle (15+ files in one generation), Hydration Streak (3-day streak), Water Cooler Regular (7-day streak), Bottomless Bottle (20+ lifetime bottles), Tinkerer (10+ edits). Badges are additive — once earned they're kept even if a streak later resets.
- `/stats` (`app/(root)/stats/page.tsx`) renders the headline numbers, badge grid, and recent-activity table server-side via `getMyStats()`.

---

## Setup

### 1. Prerequisites
- Node.js 18.17+
- A Groq API key: https://console.groq.com/keys
- A Firebase project with Authentication (Email/Password) and Firestore enabled

### 2. Install
```bash
npm install
```

### 3. Environment variables
```bash
cp .env.local.example .env.local
```
Fill in:
- `GROQ_API_KEY` — from the Groq console
- `NEXT_PUBLIC_FIREBASE_*` — Firebase Console → Project settings → General → Your apps → Web app → SDK config
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Console → Project settings → Service accounts → Generate new private key. Keep the `\n` characters in the private key literal — the code un-escapes them at runtime.

### 4. Firestore security rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    // rate_limits is only ever touched by the admin SDK (server-side), which
    // bypasses these rules entirely - this just makes sure no client can
    // read or tamper with usage counters directly.
    match /rate_limits/{docId} {
      allow read, write: if false;
    }
  }
}
```

### 5. Run it
```bash
npm run dev
```
Open http://localhost:3000, sign up, and try a prompt like:
> A pomodoro timer app with a clean minimal UI

---

## Deployment

### Vercel
1. Push to GitHub, import into Vercel.
2. Add every env var from `.env.local` to Vercel's Project Settings → Environment Variables.
3. **Function duration**: generation can take 1-3 minutes end to end. Vercel's free tier caps function duration below what's needed — a paid plan (or Fluid Compute) is required to use the 300s `maxDuration` already set in `app/api/generate/route.ts`.

### Costs to watch
- **Groq**: roughly 4-15 calls per generation depending on file count.
- **Firebase**: Firestore's free tier comfortably covers early usage.
- **Preview**: free at any scale — no third-party licensing involved.

---

## Not yet built (roadmap)

- Real backend generation (e.g. Supabase-wired projects for DB/auth/storage) - still static HTML/CSS/JS only
- Real payment/billing integration (Stripe) - a per-user daily usage cap now exists (`lib/actions/rate-limit.ts`) to protect your Groq quota, but there's no paid-tier upsell flow yet
- Password strength checks on sign-up
- Deleting/renaming projects, shareable public preview links
- Smarter context selection for the coder step on very large projects (current approach sends full file content up to a ~40k character budget, which covers small/medium projects but will start truncating on bigger ones)
