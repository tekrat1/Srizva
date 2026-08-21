"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { signOutAction } from "@/lib/actions/auth";
import { startNavProgress } from "@/lib/navProgress";

export default function SignOutButton({
  variant = "desktop",
}: {
  /** "mobile" gives a full-width, thumb-sized row for the slide-down sheet. */
  variant?: "desktop" | "mobile";
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    startNavProgress();
    try {
      await signOut(auth);
      await signOutAction();
      router.push("/");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        aria-busy={signingOut}
        className="tap group flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-muted active:bg-rose-500/10 active:text-rose-400 disabled:opacity-60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </span>
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      aria-busy={signingOut}
      className="tap tap-sm group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-400 active:bg-rose-500/15 active:text-rose-400 disabled:opacity-60"
    >
      {signingOut ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      )}
      {signingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
