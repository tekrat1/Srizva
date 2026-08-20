"use server";

import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "./auth";

export type Theme = "dark" | "light";

const THEME_COOKIE = "theme";
const THEME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function saveThemePreference(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    maxAge: THEME_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return { success: true };
}

export async function completeOnboarding(data: {
  role: string;
  companySize: string;
  theme: Theme;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await saveThemePreference(data.theme);

  // Best-effort profile save — onboarding shouldn't hard-fail the
  // person out of the app if Firestore has a hiccup, since the
  // essentials (name, theme) are already set by this point.
  try {
    await adminDb.collection("users").doc(user.uid).set(
      {
        role: data.role,
        companySize: data.companySize,
        theme: data.theme,
        onboardedAt: Date.now(),
      },
      { merge: true },
    );
  } catch {
    // ignore — theme cookie + display name are the parts that matter
    // for the rest of the app to feel personalized.
  }

  return { success: true };
}
