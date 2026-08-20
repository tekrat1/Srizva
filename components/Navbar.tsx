import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";
import SignOutButton from "./SignOutButton";
import BrandMark from "./auth/BrandMark";
import SoundToggle from "./SoundToggle";

/** Small read-only pill showing today's generation quota — e.g. "12/20 builds today". */
function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = limit > 0 && used / limit >= 0.8;

  return (
    <div
      title={`${used}/${limit} builds used today`}
      className="hidden items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted sm:flex"
    >
      <span className={isNearLimit ? "text-aurora-amber" : ""}>
        {used}/{limit} builds today
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full rounded-full ${isNearLimit ? "bg-aurora-amber" : "bg-aurora-cyan"}`}
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
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
        >
          <BrandMark size={28} animated={false} />
          Buildify
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/stats" className="text-muted hover:text-foreground">
                Stats
              </Link>
              <Link href="/usage" className="text-muted hover:text-foreground">
                Usage
              </Link>
              {usage && <UsageMeter used={usage.generate.used} limit={usage.generate.limit} />}
              <SoundToggle />
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="btn-aurora rounded-md px-4 py-2 font-medium text-white transition-[background-position] duration-500 hover:animate-shimmer"
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
