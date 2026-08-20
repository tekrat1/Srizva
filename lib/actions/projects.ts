"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "./auth";
import type { Plan, VirtualFS, UsageTotals } from "@/lib/agent/types";
import { nanoid } from "nanoid";
import { recordBuildStat } from "./stats";
import { waterMlFor } from "@/lib/water";

export interface BuildMeta {
  tookMs: number;
  usage?: UsageTotals;
}

export interface SavedProject {
  id: string;
  userId: string;
  prompt: string;
  plan: Plan;
  files: VirtualFS;
  createdAt: number;
  isPublic?: boolean;
  shareId?: string;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  generationTimeMs?: number;
  model?: string;
}

export interface PublicProject {
  id: string;
  prompt: string;
  plan: Plan;
  files: VirtualFS;
  createdAt: number;
}

export async function saveProject(
  prompt: string,
  plan: Plan,
  files: VirtualFS,
  meta?: BuildMeta
): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const ref = adminDb.collection("projects").doc();
  await ref.set({
    userId: user.uid,
    prompt,
    plan,
    files,
    createdAt: Date.now(),
    ...(meta?.usage
      ? {
          tokensUsed: meta.usage.totalTokens,
          promptTokens: meta.usage.promptTokens,
          completionTokens: meta.usage.completionTokens,
          model: meta.usage.model,
        }
      : {}),
    ...(meta?.tookMs ? { generationTimeMs: meta.tookMs } : {}),
  });

  // Best-effort — stats are a nice-to-have layer on top of the project
  // record itself, so a stats-write failure shouldn't fail the save.
  await recordBuildStat(user.uid, {
    kind: "generate",
    fileCount: Object.keys(files).length,
    tookMs: meta?.tookMs ?? 0,
    waterMl: waterMlFor("generate"),
    tokensUsed: meta?.usage?.totalTokens,
    promptTokens: meta?.usage?.promptTokens,
    completionTokens: meta?.usage?.completionTokens,
    model: meta?.usage?.model,
  }).catch(() => {});

  return { id: ref.id };
}

export async function updateProject(
  id: string,
  plan: Plan,
  files: VirtualFS,
  meta?: BuildMeta
): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const ref = adminDb.collection("projects").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.userId !== user.uid) {
    return { error: "Project not found" };
  }

  await ref.update({
    plan,
    files,
    updatedAt: Date.now(),
    ...(meta?.usage
      ? {
          tokensUsed: meta.usage.totalTokens,
          promptTokens: meta.usage.promptTokens,
          completionTokens: meta.usage.completionTokens,
          model: meta.usage.model,
        }
      : {}),
    ...(meta?.tookMs ? { generationTimeMs: meta.tookMs } : {}),
  });

  await recordBuildStat(user.uid, {
    kind: "edit",
    fileCount: Object.keys(files).length,
    tookMs: meta?.tookMs ?? 0,
    waterMl: waterMlFor("edit"),
    tokensUsed: meta?.usage?.totalTokens,
    promptTokens: meta?.usage?.promptTokens,
    completionTokens: meta?.usage?.completionTokens,
    model: meta?.usage?.model,
  }).catch(() => {});

  return { id };
}

export async function getProject(id: string): Promise<SavedProject | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const doc = await adminDb.collection("projects").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.userId !== user.uid) return null;

  return { id: doc.id, ...data } as SavedProject;
}

export async function deleteProject(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const ref = adminDb.collection("projects").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.userId !== user.uid) {
    return { error: "Project not found" };
  }

  await ref.delete();
  return { ok: true };
}

/**
 * Toggles public sharing for a project. The first time a project is made
 * public it's given a permanent random shareId (kept even if later toggled
 * back to private) so a previously-shared link doesn't silently point
 * somewhere else if the person re-enables sharing later.
 */
export async function setProjectSharing(
  id: string,
  isPublic: boolean
): Promise<{ shareId: string; isPublic: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const ref = adminDb.collection("projects").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.userId !== user.uid) {
    return { error: "Project not found" };
  }

  const existingShareId = doc.data()?.shareId as string | undefined;
  const shareId = existingShareId ?? nanoid(12);

  await ref.update({ isPublic, shareId });
  return { shareId, isPublic };
}

/** No-auth lookup used by the public /share/[shareId] page. */
export async function getPublicProject(shareId: string): Promise<PublicProject | null> {
  const snap = await adminDb
    .collection("projects")
    .where("shareId", "==", shareId)
    .where("isPublic", "==", true)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    prompt: data.prompt,
    plan: data.plan,
    files: data.files,
    createdAt: data.createdAt,
  };
}

export async function listMyProjects(): Promise<SavedProject[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const snap = await adminDb
    .collection("projects")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedProject);
}
