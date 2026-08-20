import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";
import SignOutButton from "./SignOutButton";
import BrandMark from "./auth/BrandMark";
import SoundToggle from "./SoundToggle";
import NavLinks from "./NavLinks";
import MobileNavToggle from "./MobileNavToggle";

/** Small read-only pill showing today's generation quota — e.g. "12/20 builds today". */
function UsageMeter({
  used,
  limit,
  variant = "desktop",
}: {
  used: number;
  limit: number;
  variant?: "desktop" | "mobile";
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = limit > 0 && used / limit >= 0.8;

  if (variant === "mobile") {
    return (
      <div
        title={`${used}/${limit} builds used today`}
        className="mx-1 mt-1 flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-3 text-[13px] text-muted"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            isNearLimit ? "animate-pulse bg-aurora-amber" : "bg-aurora-cyan"
          }`}
        />
        <span className={isNearLimit ? "text-aurora-amber" : ""}>
          {used}/{limit} builds today
        </span>
        <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
          <span
            className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
              isNearLimit
                ? "bg-aurora-amber"
                : "bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>
    );
  }

  return (
    <div
      title={`${used}/${limit} builds used today`}
      className="hidden items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted backdrop-blur-sm transition-colors duration-300 hover:border-white/20 lg:flex"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isNearLimit ? "animate-pulse bg-aurora-amber" : "bg-aurora-cyan"
        }`}
      />
      <span className={isNearLimit ? "text-aurora-amber" : ""}>
        {used}/{limit} builds today
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
            isNearLimit
              ? "bg-aurora-amber"
              : "bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

export default async function Navbar() {
  const user = await getCurrentUser();
  // Navbar is already an async server component, so this is just a plain
  // data fetch alongside getCurrentUser() — no new client state needed.
  const usage = user ? await getUsageStatus(user.uid) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Subtle animated gradient hairline under the header, echoing the
          brand gradient — purely decorative, ~0 layout cost. */}
      <div className="pointer-events-none h-px w-full bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.4),rgba(139,92,246,0.4),rgba(251,113,133,0.4),transparent)] bg-[length:200%_100%] animate-shimmer" />

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="tap group flex items-center gap-2 text-base font-semibold tracking-tight sm:gap-2.5 sm:text-lg"
        >
          <span className="transition-transform duration-300 ease-[var(--ease-butter)] group-hover:rotate-6">
            <BrandMark size={26} animated />
          </span>
          Srizva
        </Link>

        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {user ? (
            <>
              {/* Desktop / tablet row — collapses behind the hamburger
                  below `md` so it never wraps or clips on a phone. */}
              <div className="hidden items-center gap-3 md:flex">
                <NavLinks />
                <span className="h-5 w-px bg-border" />
                {usage && (
                  <UsageMeter used={usage.generate.used} limit={usage.generate.limit} />
                )}
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface/40 p-0.5">
                  <SoundToggle />
                  <SignOutButton />
                </div>
              </div>

              {/* Mobile hamburger + slide-down sheet, same data, sized
                  for touch. */}
              <MobileNavToggle>
                <NavLinks variant="mobile" />
                {usage && (
                  <UsageMeter
                    used={usage.generate.used}
                    limit={usage.generate.limit}
                    variant="mobile"
                  />
                )}
                <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1">
                  <SoundToggle variant="mobile" />
                  <SignOutButton variant="mobile" />
                </div>
              </MobileNavToggle>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="tap tap-sm rounded-lg px-2.5 py-1.5 text-muted transition-colors duration-200 hover:text-foreground active:bg-white/5 sm:px-3"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="tap btn-aurora relative overflow-hidden rounded-md px-3.5 py-2 font-medium text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] transition-transform duration-200 hover:scale-[1.03] hover:animate-shimmer sm:px-4"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
