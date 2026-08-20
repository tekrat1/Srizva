import Link from "next/link";
import Navbar from "@/components/Navbar";
import AuthAura from "@/components/auth/AuthAura";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      {/* Background animation — untouched, same AuthAura as before */}
      <div className="absolute inset-0 h-[900px]">
        <AuthAura />
      </div>
      {/* Glitch Drop overlay: CRT scanlines drifting above the aurora
          background, below the content */}
      <div className="glitch-drop-scanlines" />

      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-4xl px-6 py-28 text-center">
          <span className="glitch-drop-pill animate-fade-up mx-auto mb-6">
            <i />
            Now streaming builds file-by-file
          </span>

          <h1 className="glitch-drop-h1 animate-fade-up mx-auto text-4xl sm:text-6xl [animation-delay:80ms]">
            <span className="g-line" data-text="Imagine it.">
              Imagine it.
            </span>
            <span className="g-line accent">Srizva builds it.</span>
          </h1>
          <p className="glitch-drop-body animate-fade-up mx-auto mt-6 max-w-xl text-lg [animation-delay:160ms]">
            An AI agent plans the project, breaks it into tasks, and writes
            every file - with a live, running preview right in your browser.
            No local setup required.
          </p>

          <div className="animate-fade-up mt-10 flex items-center justify-center gap-4 [animation-delay:240ms]">
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="glitch-drop-cta"
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
