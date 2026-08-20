import type { NextConfig } from "next";

// NOTE: This app does NOT use WebContainers (LivePreview.tsx renders via a
// blob-URL iframe, and lib/webcontainer-fs.ts is unused dead code — no
// @webcontainer/api dependency exists in package.json). The
// Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers that used
// to be set here were breaking Firebase's signInWithPopup: COOP:same-origin
// stops the main window from reading the popup once it navigates to Google's
// auth domain, so the popup opens, goes blank, and never resolves — which is
// exactly the "redirects to signup" symptom. Do not re-add these headers
// unless WebContainers is actually wired in, and if so use
// "credentialless" for COEP (not "require-corp") and test signInWithPopup
// against it.
const nextConfig: NextConfig = {};

export default nextConfig;
