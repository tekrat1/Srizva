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
- The combined HTML is rendered via `<iframe srcDoc="...">`, sandboxed with `allow-scripts allow-forms allow-popups allow-modals`.
- No install step, no bundler, no sandbox runtime to boot — preview is effectively instant and runs entirely inside the visitor's own browser tab, never on your server.
- No third-party licensing involved at any usage scale — safe to run commercially.

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

- Rate limiting on the generate endpoint
- Iterating on an existing project ("now make the button blue") instead of only fresh generations
- Password strength checks on sign-up
- Deleting/renaming projects, shareable public preview links
- Smarter context selection for the coder step on larger projects
