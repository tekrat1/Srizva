import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, Wrench, CircleDot } from "lucide-react";

export const metadata: Metadata = {
  title: "Status & Changelog - Srizva",
  description: "What's shipped, what's in progress, and what's next for Srizva.",
};

type EntryStatus = "shipped" | "in-progress" | "planned";

const STATUS_META: Record<
  EntryStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  shipped: {
    label: "Shipped",
    className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    Icon: CheckCircle2,
  },
  "in-progress": {
    label: "In progress",
    className: "text-aurora-amber border-aurora-amber/30 bg-aurora-amber/10",
    Icon: Wrench,
  },
  planned: {
    label: "Planned",
    className: "text-muted border-border bg-white/[0.02]",
    Icon: CircleDot,
  },
};

const ENTRIES: { title: string; status: EntryStatus; body: string }[] = [
  {
    title: "AI-powered generation pipeline",
    status: "shipped",
    body: "Planner, Architect, and Coder agents turn a plain-English prompt into a working, previewable project.",
  },
  {
    title: "Live in-browser preview",
    status: "shipped",
    body: "See your generated app running instantly, no local setup.",
  },
  {
    title: "Google & email sign-in",
    status: "shipped",
    body: "Create an account with Google or email/password, with email verification for password accounts.",
  },
  {
    title: "Project download & version history",
    status: "shipped",
    body: "Download the code you generate, and step back through earlier versions of a project.",
  },
  {
    title: "Free tier — 1 build/day",
    status: "shipped",
    body: "While Srizva is in production, every account gets one free generation per day.",
  },
  {
    title: "Paid tiers with higher daily limits",
    status: "planned",
    body: "More builds per day, priority generation, and higher edit limits for people who need more.",
  },
  {
    title: "Team / collaboration features",
    status: "planned",
    body: "Share projects and build together with teammates.",
  },
];

export default function StatusPage() {
  return (
    <div className="relative min-h-screen bg-void">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Status &amp; Changelog
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Srizva is still in production — this page tracks what&apos;s
            shipped, what we&apos;re actively building, and what&apos;s
            planned next.
          </p>

          <div className="mt-10 space-y-4">
            {ENTRIES.map((entry) => {
              const meta = STATUS_META[entry.status];
              return (
                <div
                  key={entry.title}
                  className="rounded-xl border border-white/10 bg-surface/60 p-5 backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">
                      {entry.title}
                    </h3>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}
                    >
                      <meta.Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{entry.body}</p>
                </div>
              );
            })}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
