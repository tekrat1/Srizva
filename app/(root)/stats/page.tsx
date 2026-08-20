import Link from "next/link";
import { redirect } from "next/navigation";
import { Droplets, Flame, Trophy, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth";
import { getMyStats } from "@/lib/actions/stats";
import { BOTTLE_ML } from "@/lib/water";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function timeAgo(ts: number): string {
  const diffS = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffS < 60) return "just now";
  const diffM = Math.round(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.round(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const data = await getMyStats();
  const stats = data?.stats;
  const badges = data?.badges ?? [];
  const recentBuilds = data?.recentBuilds ?? [];
  const bottles = stats ? (stats.totalMl / BOTTLE_ML).toFixed(1) : "0.0";

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your <span className="text-gradient-aurora">hydration</span> stats
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Every build, edit, and (imaginary) mL of water you&apos;ve spent building with Srizva.
        </p>
      </div>

      {/* Headline stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Droplets className="h-3.5 w-3.5 text-aurora-cyan" />
            Lifetime water used
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {(stats?.totalMl ?? 0).toLocaleString()} mL
          </p>
          <p className="mt-1 text-xs text-muted">≈ {bottles} bottles</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Flame className="h-3.5 w-3.5 text-aurora-amber" />
            Current streak
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {stats?.currentStreak ?? 0} {stats?.currentStreak === 1 ? "day" : "days"}
          </p>
          <p className="mt-1 text-xs text-muted">Longest: {stats?.longestStreak ?? 0} days</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Trophy className="h-3.5 w-3.5 text-aurora-violet" />
            Total builds
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{stats?.totalBuilds ?? 0}</p>
          <p className="mt-1 text-xs text-muted">
            {stats?.totalGenerates ?? 0} generated · {stats?.totalEdits ?? 0} edited
          </p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-opacity ${
                badge.achieved
                  ? "border-aurora-violet/30 bg-gradient-to-br from-aurora-violet/10 to-aurora-cyan/5"
                  : "border-border bg-surface/40 opacity-45"
              }`}
            >
              <span className="text-2xl leading-none">{badge.emoji}</span>
              <div>
                <p className="text-sm font-medium">{badge.label}</p>
                <p className="mt-0.5 text-xs text-muted">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent build history */}
      {recentBuilds.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Recent activity</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Kind</th>
                  <th className="px-4 py-2.5 font-medium">Files</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Water</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recentBuilds.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 capitalize">{b.kind}</td>
                    <td className="px-4 py-2.5">{b.fileCount}</td>
                    <td className="px-4 py-2.5">{formatDuration(b.tookMs)}</td>
                    <td className="px-4 py-2.5 text-aurora-cyan">{b.waterMl} mL</td>
                    <td className="px-4 py-2.5 text-muted">{timeAgo(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!stats?.totalBuilds && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No builds yet — head back to the dashboard and generate your first app.
        </p>
      )}
    </div>
  );
}
