"use server";

import { adminDb } from "@/lib/firebase/admin";

/**
 * Simple daily counter per user, stored in Firestore.
 *
 * This is deliberately basic (not a sliding window, no Redis) - it resets
 * at UTC midnight and is good enough to stop a single account from burning
 * through your Groq free-tier limit or racking up a bill once you add a
 * payment method there. Swap for a proper rate limiter (e.g. Upstash) if
 * you need per-minute granularity later.
 */

const DAILY_GENERATION_LIMIT = Number(process.env.DAILY_GENERATION_LIMIT ?? 20);
const DAILY_EDIT_LIMIT = Number(process.env.DAILY_EDIT_LIMIT ?? 40);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-20"
}

async function checkAndIncrement(
  uid: string,
  kind: "generate" | "edit",
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const docId = `${uid}_${todayKey()}`;
  const ref = adminDb.collection("rate_limits").doc(docId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data()! : { generate: 0, edit: 0 };
    const current = (data[kind] as number) ?? 0;

    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }

    tx.set(
      ref,
      { ...data, [kind]: current + 1, updatedAt: Date.now() },
      { merge: true }
    );

    return { allowed: true, remaining: limit - current - 1 };
  });
}

export async function checkGenerationLimit(uid: string) {
  return checkAndIncrement(uid, "generate", DAILY_GENERATION_LIMIT);
}

export async function checkEditLimit(uid: string) {
  return checkAndIncrement(uid, "edit", DAILY_EDIT_LIMIT);
}

export interface UsageStatus {
  generate: { used: number; limit: number };
  edit: { used: number; limit: number };
}

/**
 * Read-only counterpart to checkAndIncrement, for display purposes (e.g. a
 * navbar meter). checkAndIncrement always increments on read, so it can't
 * be reused here — this just reads today's counter doc as-is.
 */
export async function getUsageStatus(uid: string): Promise<UsageStatus> {
  const docId = `${uid}_${todayKey()}`;
  const snap = await adminDb.collection("rate_limits").doc(docId).get();
  const data = snap.exists ? snap.data()! : { generate: 0, edit: 0 };

  return {
    generate: { used: (data.generate as number) ?? 0, limit: DAILY_GENERATION_LIMIT },
    edit: { used: (data.edit as number) ?? 0, limit: DAILY_EDIT_LIMIT },
  };
}
