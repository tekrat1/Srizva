"use client";

/**
 * The global top progress bar (components/RouteProgress.tsx) auto-starts
 * itself for any plain <a>/<Link> click, and auto-finishes whenever the
 * pathname/search params change. That covers most navigation.
 *
 * It can't see button clicks that do async work first and only call
 * router.push()/router.refresh() afterwards (sign out, sign in, delete +
 * refresh, etc.) — call startNavProgress() right before those so the bar
 * starts immediately on click instead of only appearing once the async
 * work already finished.
 */
const START_EVENT = "srizva:nav-progress-start";

export function startNavProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

export const NAV_PROGRESS_START_EVENT = START_EVENT;
