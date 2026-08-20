"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Gauge } from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/stats", label: "Stats", Icon: BarChart3 },
  { href: "/usage", label: "Usage", Icon: Gauge },
];

export default function NavLinks({
  variant = "desktop",
}: {
  /** "desktop": compact horizontal row with underline indicator.
   *  "mobile": full-width stacked rows sized for a thumb, used inside
   *  the slide-down sheet on small screens. */
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1">
        {LINKS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`tap flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium active:bg-white/10 ${
                isActive
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? "bg-aurora-cyan/15 text-aurora-cyan" : "bg-white/5 text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`tap tap-sm group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isActive ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 transition-all duration-300 ${
                isActive
                  ? "text-aurora-cyan"
                  : "text-muted/70 group-hover:text-aurora-cyan group-hover:scale-110"
              }`}
            />
            {label}
            {/* Sliding gradient underline — full width + visible when active,
                grows from center on hover otherwise. */}
            <span
              className={`pointer-events-none absolute inset-x-2 -bottom-0.5 h-px rounded-full bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)] transition-all duration-300 ${
                isActive
                  ? "scale-x-100 opacity-100"
                  : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-70"
              }`}
            />
            {/* Soft glow behind the active tab */}
            {isActive && (
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-white/[0.04]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
