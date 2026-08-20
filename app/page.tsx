import Link from "next/link";
import { ClipboardList, Compass, Code2, ShieldCheck, Link2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Gear from "@/components/clockwork/Gear";
import GearCluster from "@/components/clockwork/GearCluster";
import BuildDial from "@/components/clockwork/BuildDial";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";

const AGENTS = [
  {
    title: "Planner",
    body: "Breaks your prompt into a concrete task list before a line of code is written.",
    icon: ClipboardList,
  },
  {
    title: "Architect",
    body: "Designs the file structure and component boundaries the build will follow.",
    icon: Compass,
  },
  {
    title: "Coder",
    body: "Writes every file in sequence, streaming progress live as it goes.",
    icon: Code2,
  },
  {
    title: "Self-QA",
    body: "Reviews its own output and patches issues before handing back a working preview.",
    icon: ShieldCheck,
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const usage = user ? await getUsageStatus(user.uid) : null;
  const used = usage?.generate.used ?? 1;
  const limit = usage?.generate.limit ?? 20;

  return (
    <div className="clockwork-stage relative min-h-screen overflow-hidden">
      {/* Etched grid + vignette backdrop */}
      <div className="clockwork-grid" />
      <div className="clockwork-vignette" />

      {/* Corner gear clusters — real rotating SVG cogs, not an image */}
      <GearCluster className="absolute -left-16 -top-10" opacity={0.9} />
      <GearCluster className="absolute -bottom-24 -right-16" flip opacity={0.55} />

      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="clockwork-pill animate-fade-up mx-auto mb-6">
            <i />
            Now streaming builds file-by-file
          </span>

          <h1 className="clockwork-h1 animate-fade-up mx-auto text-4xl sm:text-6xl [animation-delay:80ms]">
            <span className="c-line gold">Imagine it.</span>
            <span className="c-line cream">
              <b>Srizva</b> builds it.
            </span>
          </h1>

          <p className="clockwork-body animate-fade-up mx-auto mt-6 max-w-xl text-base sm:text-lg [animation-delay:160ms]">
            An AI agent plans the project, breaks it into tasks, and writes
            every file - with a live, running preview right in your browser.
            No local setup required.
          </p>

          <div className="animate-fade-up mt-10 flex items-center justify-center gap-4 [animation-delay:240ms]">
            <Link href={user ? "/dashboard" : "/sign-up"} className="clockwork-cta">
              {user ? "Go to dashboard" : "Start building - it's free"}
            </Link>
          </div>

          {/* Instrument strip: build dial flanked by the pipeline's pace */}
          <div className="clockwork-strip animate-fade-up mx-auto mt-16 flex max-w-2xl items-center gap-6 px-6 py-6 [animation-delay:300ms] sm:gap-10 sm:px-10">
            <BuildDial used={used} limit={limit} size={104} />

            <div className="flex-1 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <span className="clockwork-icon-badge mt-0.5 h-8 w-8 shrink-0">
                  <Link2 size={15} strokeWidth={2.5} />
                </span>
                <p className="clockwork-body text-sm leading-snug text-clockwork-cream/80">
                  Every planning decision streams to you in real time.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="clockwork-icon-badge mt-0.5 h-8 w-8 shrink-0 overflow-hidden">
                  <Gear teeth={8} size={22} duration="14s" tone="gold" spokes={0} />
                </span>
                <p className="clockwork-body text-sm leading-snug text-clockwork-cream/80">
                  Each task runs in order, one file at a time.
                </p>
              </div>
            </div>
          </div>

          {/* Agent pipeline cards */}
          <div className="mt-14 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent, i) => (
              <div
                key={agent.title}
                className="clockwork-card animate-fade-up p-6"
                style={{ animationDelay: `${360 + i * 90}ms` }}
              >
                <span className="clockwork-icon-badge mb-4">
                  <agent.icon size={17} strokeWidth={2.4} />
                </span>
                <h3 className="font-glitch-display font-semibold uppercase tracking-wide text-clockwork-gold-light">
                  {agent.title}
                </h3>
                <p className="clockwork-body mt-2 text-sm text-clockwork-cream/70">
                  {agent.body}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
