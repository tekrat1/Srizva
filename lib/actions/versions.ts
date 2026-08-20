"use server";

import type { DocumentReference, DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "./auth";
import type { Plan, VirtualFS } from "@/lib/agent/types";

export type VersionKind = "generate" | "edit" | "restore";

export interface ProjectVersion {
  id: string;
  label: string;
  kind: VersionKind;
  plan: Plan;
  files: VirtualFS;
  createdAt: number;
}

// Keep a bounded history per project so Firestore storage doesn't grow
// unbounded on projects with lots of edits - oldest snapshots beyond this
// are pruned whenever a new one is created.
const MAX_VERSIONS_PER_PROJECT = 30;

type OwnedProjectResult =
  | { ok: true; ref: DocumentReference<DocumentData> }
  | { ok: false; error: string };

async function assertOwnedProject(projectId: string): Promise<OwnedProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ref = adminDb.collection("projects").doc(projectId);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.userId !== user.uid) {
    return { ok: false, error: "Project not found" };
  }
  return { ok: true, ref };
}

/** Snapshots the current plan+files as a new version, then prunes old ones. */
export async function createVersion(
  projectId: string,
  label: string,
  kind: VersionKind,
  plan: Plan,
  files: VirtualFS
): Promise<{ id: string } | { error: string }> {
  const owned = await assertOwnedProject(projectId);
  if (!owned.ok) return { error: owned.error };

  const versionRef = owned.ref.collection("versions").doc();
  await versionRef.set({ label, kind, plan, files, createdAt: Date.now() });

  const snap = await owned.ref.collection("versions").orderBy("createdAt", "desc").get();
  if (snap.size > MAX_VERSIONS_PER_PROJECT) {
    const excess = snap.docs.slice(MAX_VERSIONS_PER_PROJECT);
    await Promise.all(excess.map((d) => d.ref.delete()));
  }

  return { id: versionRef.id };
}

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  const owned = await assertOwnedProject(projectId);
  if (!owned.ok) return [];

  const snap = await owned.ref
    .collection("versions")
    .orderBy("createdAt", "desc")
    .limit(MAX_VERSIONS_PER_PROJECT)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProjectVersion);
}

/** Restores a past version onto the live project doc and records the restore itself as a new version (so undo/redo scrubbing never loses history). */
export async function restoreVersion(
  projectId: string,
  versionId: string
): Promise<{ plan: Plan; files: VirtualFS } | { error: string }> {
  const owned = await assertOwnedProject(projectId);
  if (!owned.ok) return { error: owned.error };

  const versionDoc = await owned.ref.collection("versions").doc(versionId).get();
  if (!versionDoc.exists) return { error: "Version not found" };

  const data = versionDoc.data()!;
  const plan = data.plan as Plan;
  const files = data.files as VirtualFS;

  await owned.ref.update({ plan, files, updatedAt: Date.now() });
  await createVersion(
    projectId,
    `Restored version from ${new Date(data.createdAt as number).toLocaleString()}`,
    "restore",
    plan,
    files
  );

  return { plan, files };
}
