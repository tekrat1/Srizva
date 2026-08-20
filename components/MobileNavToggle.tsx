"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Hamburger trigger + slide-down sheet for the navbar's signed-in
 * content on small screens. The desktop row (NavLinks, usage meter,
 * sound toggle, sign out) doesn't fit a phone width, so on mobile we
 * collapse it all behind this button instead of letting it wrap/clip.
 */
export default function MobileNavToggle({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const btnRef = useRef<HTMLButtonElement>(null);

  // Keep the panel mounted one tick after close so the exit
  // transition (opacity/translate) actually gets to play instead of
  // the content just vanishing.
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 280);
    return () => clearTimeout(t);
  }, [open]);

  // Lock body scroll while the sheet is open so the page behind it
  // doesn't jitter/scroll on touch.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape, and whenever navigation actually happens.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="tap tap-sm relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/60 text-foreground active:bg-surface"
      >
        <span className="relative flex h-3.5 w-4 flex-col justify-between">
          <span
            className={`hamburger-line h-[1.5px] w-full rounded-full bg-current ${
              open ? "translate-y-[6.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`hamburger-line h-[1.5px] w-full rounded-full bg-current ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`hamburger-line h-[1.5px] w-full rounded-full bg-current ${
              open ? "-translate-y-[6.5px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {mounted && (
        <>
          {/* Backdrop — tap outside to close. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            data-state={open ? "open" : "closed"}
            className="mobile-nav-backdrop fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <div
            data-state={open ? "open" : "closed"}
            className="mobile-nav-sheet fixed inset-x-3 top-[4.25rem] z-40 overflow-hidden rounded-2xl border border-border bg-surface/95 pb-safe shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1 p-3">{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
