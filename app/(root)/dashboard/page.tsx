import { Sparkles } from "lucide-react";
import GenerationWorkbench from "@/components/GenerationWorkbench";
import ProjectCard from "@/components/ProjectCard";
import { listMyProjects } from "@/lib/actions/projects";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function DashboardPage() {
  const [projects, user] = await Promise.all([
    listMyProjects(),
    getCurrentUser(),
  ]);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-12">
      <div className="relative -mx-6 -mt-4 overflow-hidden rounded-2xl px-6 pb-8 pt-10">
        <div aria-hidden className="glow-wash pointer-events-none absolute inset-0" />
        <div className="relative animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] font-medium tracking-wide text-muted backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-aurora-violet" />
            build mode
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            What should we build
            {firstName ? (
              <>
                , <span className="text-gradient-aurora">{firstName}</span>
              </>
            ) : (
              ""
            )}
            ?
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Describe it in a sentence. You&apos;ll see it get planned, coded, and previewed live.
          </p>
        </div>
      </div>

      <GenerationWorkbench />

      {projects.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Your projects</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                id={p.id}
                name={p.plan?.name ?? "Untitled"}
                prompt={p.prompt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
