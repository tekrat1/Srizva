"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { signOutAction } from "@/lib/actions/auth";

export default function SignOutButton({
  variant = "desktop",
}: {
  /** "mobile" gives a full-width, thumb-sized row for the slide-down sheet. */
  variant?: "desktop" | "mobile";
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    await signOutAction();
    router.push("/");
    router.refresh();
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={handleSignOut}
        className="tap group flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-muted active:bg-rose-500/10 active:text-rose-400"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <LogOut className="h-4 w-4" />
        </span>
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="tap tap-sm group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-400 active:bg-rose-500/15 active:text-rose-400"
    >
      <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      Sign out
    </button>
  );
}
