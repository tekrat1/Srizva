"use server";

import { adminDb } from "@/lib/firebase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stores an email from someone who isn't signing up yet — the homepage
 * "notify me" capture for visitors who bounce without creating an account.
 * Deliberately separate from the `users` collection: no auth, no password,
 * just an address + timestamp so we can email updates later.
 */
export async function joinWaitlist(
  email: string
): Promise<{ success: true } | { error: string }> {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return { error: "Enter a valid email address." };
  }

  try {
    // Doc ID = email itself, so re-submitting the same address is a
    // harmless overwrite instead of a duplicate entry.
    await adminDb.collection("waitlist").doc(trimmed).set(
      {
        email: trimmed,
        createdAt: Date.now(),
      },
      { merge: true }
    );
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
