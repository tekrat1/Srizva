"use server";

import { adminDb } from "@/lib/firebase/admin";

/**
 * Daily build quota, stored in Firestore. One counter shared by BOTH the
 * generate route and the edit route: a "build" is either "create a new
 * project" or "apply an edit to an existing one". Whichever happens
 * first today consumes the day's single allowance, and both the
 * Generate button and the Apply edit button stay locked for the rest of
 * the day. It resets at UTC midnight.
 *
 * This is deliberately basic (not a sliding window, no Redis) - good
 * enough for a hard per-user daily cap that also protects token spend.
 * Swap for a proper rate limiter (e.g. Upstash) if you need something
 * more sophisticated later.
 */

const DAILY_BUILD_LIMIT = Number(process.env.DAILY_BUILD_LIMIT ?? 1);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-20"
}

/** ms until the next UTC midnight, for "come back in X" messaging. */
function msUntilReset(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return next.getTime() - now.getTime();
}

export interface BuildLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  /** ms until the quota resets (UTC midnight) — only meaningful when !allowed. */
  resetsInMs: number;
}

/**
 * Atomically checks + consumes today's shared build quota for a user.
 * Call this once per generate or per edit request, right before doing
 * any real work, so a denied request never touches the LLM.
 */
export async function checkBuildLimit(uid: string): Promise<BuildLimitResult> {
  const docId = `${uid}_${todayKey()}`;
  const ref = adminDb.collection("rate_limits").doc(docId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data()! : { build: 0 };
    const current = (data.build as number) ?? 0;

    if (current >= DAILY_BUILD_LIMIT) {
      return {
        allowed: false,
        used: current,
        limit: DAILY_BUILD_LIMIT,
        resetsInMs: msUntilReset(),
      };
    }

    tx.set(
      ref,
      { ...data, build: current + 1, updatedAt: Date.now() },
      { merge: true }
    );

    return {
      allowed: true,
      used: current + 1,
      limit: DAILY_BUILD_LIMIT,
      resetsInMs: msUntilReset(),
    };
  });
}

// Back-compat aliases: both actions draw from the same shared quota now,
// so these just forward to checkBuildLimit. Kept so any other callers
// don't need to change.
export async function checkGenerationLimit(uid: string) {
  return checkBuildLimit(uid);
}
export async function checkEditLimit(uid: string) {
  return checkBuildLimit(uid);
}

export interface UsageStatus {
  generate: { used: number; limit: number };
  edit: { used: number; limit: number };
  /** true once today's single build has been used — Generate + Apply edit should both be disabled. */
  locked: boolean;
  resetsInMs: number;
}

/**
 * Read-only counterpart to checkBuildLimit, for display purposes (nav
 * usage meter, and to pre-lock the UI on page load). Does NOT consume
 * the quota.
 */
export async function getUsageStatus(uid: string): Promise<UsageStatus> {
  const docId = `${uid}_${todayKey()}`;
  const snap = await adminDb.collection("rate_limits").doc(docId).get();
  const data = snap.exists ? snap.data()! : { build: 0 };
  const used = (data.build as number) ?? 0;

  return {
    generate: { used, limit: DAILY_BUILD_LIMIT },
    edit: { used, limit: DAILY_BUILD_LIMIT },
    locked: used >= DAILY_BUILD_LIMIT,
    resetsInMs: msUntilReset(),
  };
}
