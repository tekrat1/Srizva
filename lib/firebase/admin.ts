import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Lazy + defensive: only actually initializes (and can only throw) the
// first time something is called, not at import time. This means pages
// that don't need auth (landing page, etc.) can still render even if
// Firebase env vars aren't set up yet - useful while you're just
// wiring up the UI before Firebase is connected.
function isConfigured() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

let adminApp: App | null = null;
function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  if (!isConfigured()) {
    throw new Error(
      "Firebase admin env vars are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local (see README)."
    );
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  return adminApp;
}

// Proxies so `adminAuth.verifySessionCookie(...)` etc. still work exactly
// like before, but the real Firebase app is only created the moment a
// method is actually called - not just because this file was imported.
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const real = getAuth(getAdminApp());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (real as any)[prop];
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const real = getFirestore(getAdminApp());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (real as any)[prop];
  },
});
