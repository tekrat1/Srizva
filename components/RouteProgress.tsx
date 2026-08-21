"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_PROGRESS_START_EVENT } from "@/lib/navProgress";

/**
 * A slim gradient bar pinned to the very top of the viewport that gives
 * instant visual feedback the moment any navigation starts, and eases
 * to 100% + fades out once the new route has actually landed.
 *
 * Two ways it starts:
 *  1. A capture-phase click listener on `document` — catches any plain
 *     internal <a>/<Link> click anywhere in the app, no per-link wiring.
 *  2. The `srizva:nav-progress-start` window event, for buttons that do
 *     async work before calling router.push() (see lib/navProgress.ts).
 *
 * It finishes automatically whenever the pathname or search params
 * actually change — i.e. once the new route has committed.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  function clearTimers() {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    if (hideRef.current !== null) window.clearTimeout(hideRef.current);
    tickRef.current = null;
    hideRef.current = null;
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress((p) => (p > 0 && p < 100 ? p : 8));
    tickRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Slows down the closer it gets to 90 so it never *looks* finished
        // before the real navigation actually lands.
        const remaining = 90 - p;
        return p + Math.max(0.6, remaining * 0.12);
      });
    }, 110);
  }

  function finish() {
    clearTimers();
    setProgress(100);
    hideRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    window.addEventListener(NAV_PROGRESS_START_EVENT, start);
    return () => window.removeEventListener(NAV_PROGRESS_START_EVENT, start);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    finish();
    // Only the actual route identity should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => clearTimers, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden="true">
      <div
        className="h-full bg-[linear-gradient(90deg,#22d3ee,#8b5cf6,#fb7185)] shadow-[0_0_12px_rgba(139,92,246,0.65)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
      />
    </div>
  );
}
