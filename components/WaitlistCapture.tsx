"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { joinWaitlist } from "@/lib/actions/waitlist";

export default function WaitlistCapture() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await joinWaitlist(email);

    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto mt-24 max-w-lg px-6 text-center">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          You&apos;re on the list — we&apos;ll email you when new features land.
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto mt-24 max-w-lg px-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Not ready to build yet?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Leave your email and we&apos;ll let you know as new features and
        higher free-tier limits ship.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-surface/80 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background/80 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Joining..." : "Notify me"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </section>
  );
}
