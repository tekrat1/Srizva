// Widely-cited estimate: a handful of prompts to a large model can cost
// roughly a bottle's worth of water for cooling. We're not claiming this
// number is precise — it's the joke, rendered as a stat.
// Exported from a plain (non-"use client") module so both client
// components (WaterBottle, ReceiptCard) and server actions (stats.ts)
// import the exact same numbers instead of a second constant drifting
// out of sync.
export const BOTTLE_ML = 500;
// A single edit "tops up" rather than draining a whole fresh bottle.
export const EDIT_ML = 150;

/** Water used for a given build kind, in mL. */
export function waterMlFor(kind: "generate" | "edit"): number {
  return kind === "generate" ? BOTTLE_ML : EDIT_ML;
}
