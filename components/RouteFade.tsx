"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps page content so every navigation gets a soft fade/slide-in
 * instead of content just snapping into place. Keying on the pathname
 * forces React to remount the wrapper (and replay the CSS animation)
 * on every route change, not just on first load.
 */
export default function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade-in">
      {children}
    </div>
  );
}
