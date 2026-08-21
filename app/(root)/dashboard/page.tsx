import GenerationWorkbench from "@/components/GenerationWorkbench";
import ProjectCard from "@/components/ProjectCard";
import { listMyProjects } from "@/lib/actions/projects";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";

export default async function DashboardPage() {
  const [projects, user] = await Promise.all([
    listMyProjects(),
    getCurrentUser(),
  ]);
  const firstName = user?.name?.split(" ")[0];
  const usage = user ? await getUsageStatus(user.uid) : null;

  return (
    <div className="space-y-12">
      <div className="relative -mx-6 -mt-4 overflow-hidden rounded-2xl px-6 pb-8 pt-10">
        {/* Background animation — untouched, same glow-wash as before */}
        <div aria-hidden className="glow-wash pointer-events-none absolute inset-0" />
        {/* Glitch Drop overlay: CRT scanlines above the glow, below the content */}
        <div aria-hidden className="glitch-drop-scanlines" />
        <div className="relative animate-fade-up">
          <span className="glitch-drop-pill">
            <i />
            build mode
          </span>
          <h1 className="glitch-drop-h1 mt-3 text-3xl sm:text-4xl">
            <span className="g-line" data-text="What should we build">
              What should we build
            </span>
            {firstName ? (
              <span className="g-line accent">, {firstName}?</span>
            ) : (
              <span className="g-line accent">?</span>
            )}
          </h1>
          <p className="glitch-drop-body mt-2 max-w-md text-sm">
            Describe it in a sentence. You&apos;ll see it get planned, coded, and previewed live.
          </p>
        </div>
      </div>

      <GenerationWorkbench
        initialLocked={usage?.locked ?? false}
        initialResetsInMs={usage?.resetsInMs ?? null}
      />

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
