import { Sparkles, Zap } from "lucide-react";

export default function PricingCallout() {
  return (
    <section className="mx-auto mt-24 max-w-4xl px-6">
      <div className="rounded-2xl border border-white/10 bg-surface/60 p-8 backdrop-blur-sm sm:p-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="glitch-drop-pill">
              <i />
              Free while we&apos;re in production
            </span>
            <h2 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
              1 build a day, on us
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Srizva is still early. Every account gets one free generation
              per day so everyone gets a fair shot at trying it — it resets
              every 24 hours, no credit card required. Paid tiers with more
              builds are coming soon.
            </p>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-white/10 bg-background/60 p-5 sm:w-56">
            <div className="flex items-center gap-2 text-aurora-cyan">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Free tier
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">1<span className="text-base font-normal text-muted"> / day</span></p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted">
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0 text-aurora-violet" />
                Full generation pipeline
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0 text-aurora-violet" />
                Live in-browser preview
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0 text-aurora-violet" />
                Download your code anytime
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
