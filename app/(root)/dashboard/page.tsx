import Link from "next/link";
import GenerationWorkbench from "@/components/GenerationWorkbench";
import { listMyProjects } from "@/lib/actions/projects";

export default async function DashboardPage() {
  const projects = await listMyProjects();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold">What do you want to build?</h1>
        <p className="mt-1 text-sm text-muted">
          Describe it in a sentence. You&apos;ll see it get planned, coded, and previewed live.
        </p>
      </div>

      <GenerationWorkbench />

      {projects.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Your projects</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="rounded-lg border border-border bg-surface p-4 hover:border-primary"
              >
                <p className="truncate font-medium">{p.plan?.name ?? "Untitled"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{p.prompt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
