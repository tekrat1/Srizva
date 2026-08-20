"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "./auth";
import { BOTTLE_ML } from "@/lib/water";

export interface BuildStatInput {
  kind: "generate" | "edit";
  fileCount: number;
  tookMs: number;
  waterMl: number;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}

export interface UserStats {
  totalMl: number;
  totalBuilds: number;
  totalGenerates: number;
  totalEdits: number;
  totalFiles: number;
  currentStreak: number;
  longestStreak: number;
  lastBuildDay: string | null;
  badgeIds: string[];
}

export interface BadgeInfo {
  id: string;
  emoji: string;
  label: string;
  description: string;
  achieved: boolean;
}

export interface RecentBuild {
  id: string;
  kind: "generate" | "edit";
  fileCount: number;
  tookMs: number;
  waterMl: number;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  createdAt: number;
}

const EMPTY_STATS: UserStats = {
  totalMl: 0,
  totalBuilds: 0,
  totalGenerates: 0,
  totalEdits: 0,
  totalFiles: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastBuildDay: null,
  badgeIds: [],
};

// Keep a bounded activity history per user - same pattern as
// lib/actions/versions.ts - so Firestore storage doesn't grow unbounded
// for very active users.
const MAX_RECENT_BUILDS = 50;

function utcDayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10); // "2026-08-20"
}

/** Days between two "YYYY-MM-DD" UTC day keys. */
function dayDiff(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / msPerDay);
}

/**
 * Given the stats state *after* this build has been folded in, decides
 * which badges have been earned. Badges are additive - once earned they
 * stay in the stored badgeIds list even if a streak later resets, so this
 * only ever needs to know the current totals, not history.
 */
function badgeDefs(): Omit<BadgeInfo, "achieved">[] {
  return [
    {
      id: "first_sip",
      emoji: "💧",
      label: "First Sip",
      description: "Completed your first build.",
    },
    {
      id: "efficient_sipper",
      emoji: "🥤",
      label: "Efficient Sipper",
      description: "Finished a build in under 20 seconds.",
    },
    {
      id: "whole_bottle",
      emoji: "🍾",
      label: "Chugged the Whole Bottle",
      description: "Generated a 15+ file app in one go.",
    },
    {
      id: "hydration_streak",
      emoji: "🔥",
      label: "Hydration Streak",
      description: "Built something 3 days in a row.",
    },
    {
      id: "water_cooler_regular",
      emoji: "🚰",
      label: "Water Cooler Regular",
      description: "Built something 7 days in a row.",
    },
    {
      id: "bottomless_bottle",
      emoji: "♾️",
      label: "Bottomless Bottle",
      description: `Used ${20 * BOTTLE_ML}+ mL of water lifetime (20 bottles).`,
    },
    {
      id: "tinkerer",
      emoji: "🛠️",
      label: "Tinkerer",
      description: "Applied 10+ edits across your projects.",
    },
  ];
}

function computeEarnedIds(
  stats: UserStats,
  justBuilt: { fileCount: number; tookMs: number }
): string[] {
  const earned = new Set(stats.badgeIds);
  if (stats.totalBuilds >= 1) earned.add("first_sip");
  if (justBuilt.tookMs > 0 && justBuilt.tookMs < 20_000) earned.add("efficient_sipper");
  if (justBuilt.fileCount >= 15) earned.add("whole_bottle");
  if (stats.currentStreak >= 3) earned.add("hydration_streak");
  if (stats.currentStreak >= 7) earned.add("water_cooler_regular");
  if (stats.totalMl >= 20 * BOTTLE_ML) earned.add("bottomless_bottle");
  if (stats.totalEdits >= 10) earned.add("tinkerer");
  return Array.from(earned);
}

/** Badge list with achieved/locked state, for rendering on /stats via getMyStats. */
function computeBadges(stats: UserStats): BadgeInfo[] {
  const earned = new Set(stats.badgeIds);
  return badgeDefs().map((b) => ({ ...b, achieved: earned.has(b.id) }));
}

/**
 * Folds one completed build into the user's lifetime stats: bumps totals,
 * updates the UTC-day streak (same day = no change, exactly one day later
 * = streak+1, any bigger gap = streak resets to 1), and recomputes badges.
 * Also appends a bounded recent-builds history entry.
 *
 * Best-effort by design (callers should swallow errors) - stats are a
 * layer on top of the actual project save, not something that should ever
 * block or fail a build.
 */
export async function recordBuildStat(uid: string, input: BuildStatInput): Promise<void> {
  const statsRef = adminDb.collection("user_stats").doc(uid);
  const now = Date.now();
  const today = utcDayKey(now);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const prev: UserStats = snap.exists ? { ...EMPTY_STATS, ...(snap.data() as UserStats) } : EMPTY_STATS;

    let { currentStreak, longestStreak } = prev;
    if (!prev.lastBuildDay) {
      currentStreak = 1;
    } else {
      const diff = dayDiff(prev.lastBuildDay, today);
      if (diff === 0) {
        // Same UTC day - streak unchanged.
      } else if (diff === 1) {
        currentStreak = prev.currentStreak + 1;
      } else {
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    const next: UserStats = {
      totalMl: prev.totalMl + input.waterMl,
      totalBuilds: prev.totalBuilds + 1,
      totalGenerates: prev.totalGenerates + (input.kind === "generate" ? 1 : 0),
      totalEdits: prev.totalEdits + (input.kind === "edit" ? 1 : 0),
      totalFiles: prev.totalFiles + input.fileCount,
      currentStreak,
      longestStreak,
      lastBuildDay: today,
      badgeIds: prev.badgeIds,
    };
    next.badgeIds = computeEarnedIds(next, { fileCount: input.fileCount, tookMs: input.tookMs });

    tx.set(statsRef, next, { merge: true });
  });

  const historyRef = adminDb.collection("build_stats").doc();
  await historyRef.set({
    userId: uid,
    kind: input.kind,
    fileCount: input.fileCount,
    tookMs: input.tookMs,
    waterMl: input.waterMl,
    ...(input.tokensUsed !== undefined ? { tokensUsed: input.tokensUsed } : {}),
    ...(input.promptTokens !== undefined ? { promptTokens: input.promptTokens } : {}),
    ...(input.completionTokens !== undefined ? { completionTokens: input.completionTokens } : {}),
    ...(input.model ? { model: input.model } : {}),
    createdAt: now,
  });

  const oldSnap = await adminDb
    .collection("build_stats")
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .offset(MAX_RECENT_BUILDS)
    .limit(20)
    .get();
  if (!oldSnap.empty) {
    const batch = adminDb.batch();
    oldSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function getMyStats(): Promise<{
  stats: UserStats;
  badges: BadgeInfo[];
  recentBuilds: RecentBuild[];
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [statsSnap, recentSnap] = await Promise.all([
    adminDb.collection("user_stats").doc(user.uid).get(),
    adminDb
      .collection("build_stats")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
  ]);

  const stats: UserStats = statsSnap.exists
    ? { ...EMPTY_STATS, ...(statsSnap.data() as UserStats) }
    : EMPTY_STATS;

  const recentBuilds: RecentBuild[] = recentSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      kind: data.kind,
      fileCount: data.fileCount,
      tookMs: data.tookMs,
      waterMl: data.waterMl,
      tokensUsed: data.tokensUsed,
      model: data.model,
      createdAt: data.createdAt,
    };
  });

  return { stats, badges: computeBadges(stats), recentBuilds };
}
