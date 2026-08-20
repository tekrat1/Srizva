import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getPublicProject } from "@/lib/actions/projects";
import LivePreview from "@/components/LivePreview";
import BrandMark from "@/components/auth/BrandMark";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const project = await getPublicProject(shareId);
  if (!project) return { title: "Shared build — Srizva" };
  return {
    title: `${project.plan.name} — built with Srizva`,
    description: project.plan.description,
  };
}

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const project = await getPublicProject(shareId);

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <BrandMark size={28} animated={false} />
            Srizva
          </Link>
          <Link
            href="/sign-up"
            className="btn-aurora flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Build your own
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] font-medium tracking-wide text-muted">
            Shared build — read-only
          </span>
          <h1 className="mt-3 text-2xl font-semibold">{project.plan.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{project.plan.description}</p>
        </div>

        <div className="h-[600px] overflow-hidden rounded-xl border border-border shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <LivePreview files={project.files} />
        </div>

        <p className="text-center text-xs text-muted">
          Built from a one-line prompt with{" "}
          <Link href="/" className="text-aurora-cyan hover:underline">
            Srizva
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
