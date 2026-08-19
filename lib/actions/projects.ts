"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "./auth";
import type { Plan, VirtualFS } from "@/lib/agent/types";

export interface SavedProject {
  id: string;
  userId: string;
  prompt: string;
  plan: Plan;
  files: VirtualFS;
  createdAt: number;
}

export async function saveProject(
  prompt: string,
  plan: Plan,
  files: VirtualFS
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
  });

  return { id: ref.id };
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
