import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Coins, Cpu, Gauge, Timer } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth";
import { listMyProjects } from "@/lib/actions/projects";
import { estimateCostUsd, formatCostUsd } from "@/lib/agent/pricing";

function formatDuration(ms: number): string {
  if (!ms) return "—";
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

export default async function UsagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const projects = await listMyProjects();

  // Every aggregate below is derived straight from the fields already
  // stored on each project doc (tokensUsed/promptTokens/completionTokens/
  // generationTimeMs/model) — listMyProjects() already has everything this
  // page needs, nothing new to fetch.
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalTimeMs = 0;
  let totalCostUsd = 0;
  let costIsPartial = false; // true if any project's model isn't in the pricing table
  const modelCounts = new Map<string, number>();

  const rows = projects.map((p) => {
    const promptTokens = p.promptTokens ?? 0;
    const completionTokens = p.completionTokens ?? 0;
    const tokens = p.tokensUsed ?? promptTokens + completionTokens;
    const cost = p.model ? estimateCostUsd(p.model, promptTokens, completionTokens) : null;

    totalPromptTokens += promptTokens;
    totalCompletionTokens += completionTokens;
    totalTokens += tokens;
    totalTimeMs += p.generationTimeMs ?? 0;
    if (cost !== null) totalCostUsd += cost;
    else if (tokens > 0) costIsPartial = true;

    if (p.model) modelCounts.set(p.model, (modelCounts.get(p.model) ?? 0) + 1);

    return {
      id: p.id,
      name: p.plan?.name ?? "Untitled",
      prompt: p.prompt,
      tokens,
      cost,
      timeMs: p.generationTimeMs ?? 0,
      model: p.model,
      createdAt: p.createdAt,
    };
  });

  let mostUsedModel: string | null = null;
  let mostUsedCount = 0;
  for (const [model, count] of modelCounts) {
    if (count > mostUsedCount) {
      mostUsedModel = model;
      mostUsedCount = count;
    }
  }

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
          Usage &amp; <span className="text-gradient-aurora">cost</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Tokens, time, and an estimated dollar cost across every project you&apos;ve generated.
        </p>
      </div>

      {/* Headline stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Gauge className="h-3.5 w-3.5 text-aurora-cyan" />
            Total tokens
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {totalTokens.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted">
            {totalPromptTokens.toLocaleString()} in · {totalCompletionTokens.toLocaleString()} out
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Coins className="h-3.5 w-3.5 text-aurora-amber" />
            Estimated cost
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {formatCostUsd(totalCostUsd)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {costIsPartial ? "Partial — some builds use an unpriced model" : "Illustrative, not a bill"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Timer className="h-3.5 w-3.5 text-aurora-violet" />
            Total generation time
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{formatDuration(totalTimeMs)}</p>
          <p className="mt-1 text-xs text-muted">Across {projects.length} project{projects.length === 1 ? "" : "s"}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Cpu className="h-3.5 w-3.5 text-aurora-cyan" />
            Most-used model
          </div>
          <p className="mt-3 truncate text-lg font-semibold tracking-tight" title={mostUsedModel ?? undefined}>
            {mostUsedModel ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {mostUsedModel ? `${mostUsedCount} build${mostUsedCount === 1 ? "" : "s"}` : "No builds yet"}
          </p>
        </div>
      </div>

      {/* Per-project breakdown */}
      {rows.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Per-project breakdown</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Tokens</th>
                  <th className="px-4 py-2.5 font-medium">Cost</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/project/${r.id}`} className="hover:text-aurora-cyan">
                        <span className="block max-w-[220px] truncate font-medium">{r.name}</span>
                        <span className="block max-w-[220px] truncate text-xs text-muted">{r.prompt}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{r.tokens > 0 ? r.tokens.toLocaleString() : "—"}</td>
                    <td className="px-4 py-2.5">{r.cost !== null ? formatCostUsd(r.cost) : "—"}</td>
                    <td className="px-4 py-2.5">{formatDuration(r.timeMs)}</td>
                    <td className="px-4 py-2.5 text-muted">{r.model ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No projects yet — head back to the dashboard and generate your first app.
        </p>
      )}
    </div>
  );
}
