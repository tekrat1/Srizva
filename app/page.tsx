import Link from "next/link";
import Navbar from "@/components/Navbar";
import AuthAura from "@/components/auth/AuthAura";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <div className="absolute inset-0 h-[900px]">
        <AuthAura />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-4xl px-6 py-28 text-center">
          <span className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 animate-twinkle rounded-full bg-aurora-cyan" />
            Now streaming builds file-by-file
          </span>

          <h1 className="animate-fade-up text-4xl font-bold tracking-tight sm:text-6xl [animation-delay:80ms]">
            Describe your website.
            <br />
            <span className="text-gradient-aurora">
              Watch it get built live.
            </span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-muted [animation-delay:160ms]">
            An AI agent plans the project, breaks it into tasks, and writes
            every file - with a live, running preview right in your browser.
            No local setup required.
          </p>

          <div className="animate-fade-up mt-10 flex items-center justify-center gap-4 [animation-delay:240ms]">
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="btn-aurora rounded-md px-6 py-3 font-medium text-white transition-[background-position] duration-500 hover:animate-shimmer"
            >
              {user ? "Go to dashboard" : "Start building - it's free"}
            </Link>
          </div>

          <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
            {[
              {
                title: "1. Describe it",
                body: "\"A todo app with dark mode\" or \"a pricing page for my SaaS\" - plain English is enough.",
              },
              {
                title: "2. Watch it build",
                body: "A Planner, Architect, and Coder agent work in sequence, streaming progress file by file.",
              },
              {
                title: "3. Preview & ship",
                body: "See it running live in-browser instantly, then download the code or keep iterating.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="animate-fade-up rounded-xl border border-white/10 bg-surface/60 p-6 backdrop-blur-sm transition-colors hover:border-white/20"
                style={{ animationDelay: `${320 + i * 90}ms` }}
              >
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
