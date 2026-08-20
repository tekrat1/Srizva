import Link from "next/link";
import { Settings, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";
import SignOutButton from "./SignOutButton";

/**
 * Kinetic Clockwork theme -- the nav row + usage badge live inside the
 * same dark panel as the hero art in the reference render, so this is a
 * theme-specific nav (gear mark, uppercase letter-spaced links, a small
 * clock badge) rather than the shared site <Navbar>. Real auth/usage
 * data, same links as the standard navbar -- just restyled to match.
 */
export default async function ClockworkNav() {
  const user = await getCurrentUser();
  const usage = user ? await getUsageStatus(user.uid) : null;
  const generate = usage?.generate ?? { used: 0, limit: 20 };

  return (
    <div className="relative z-10">
      <div className="clockwork-nav flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[#f5f0e6]"
        >
          <Settings size={18} className="clockwork-nav-mark" />
          Srizva
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/stats">Stats</Link>
              <Link href="/usage">Usage</Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Get started</Link>
            </>
          )}
        </div>
      </div>

      {/* small clock badge -- "N/limit builds today" -- right-aligned under the nav */}
      <div className="flex justify-end px-6 pt-3 sm:px-10">
        <div className="clockwork-usage-badge">
          <Clock size={13} />
          <span>
            <b>
              {generate.used}/{generate.limit} builds
            </b>
            today
          </span>
        </div>
      </div>
    </div>
  );
}
