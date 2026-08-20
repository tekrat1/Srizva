"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "srizva-cookie-consent"; // "essential" | "all"

/**
 * Srizva currently only sets one cookie — the session cookie that keeps
 * you signed in, which is strictly necessary and isn't optional. There's
 * no ad/analytics tracking today. This banner is here so that if/when
 * analytics or ad cookies are added later, they can be gated behind
 * `getCookieConsent() === "all"` — check that before loading any such
 * script. Until then it's an honest notice, not a real choice between
 * two different sets of cookies.
 */
export function getCookieConsent(): "essential" | "all" | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) as "essential" | "all" | null;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  function choose(choice: "essential" | "all") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-void/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-aurora-amber" />
          <p className="text-sm text-muted">
            We use one essential cookie to keep you signed in. We don&apos;t
            use ad-tracking cookies. See our{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("essential")}
            className="rounded-md border border-border bg-background/80 px-4 py-2 text-xs font-medium transition-colors hover:bg-surface"
          >
            Essential only
          </button>
          <button
            onClick={() => choose("all")}
            className="btn-aurora rounded-md px-4 py-2 text-xs font-medium text-white transition-[background-position] duration-500 hover:animate-shimmer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
