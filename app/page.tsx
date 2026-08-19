import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-28 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Describe your website.
          <br />
          <span className="text-primary">Watch it get built live.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          An AI agent plans the project, breaks it into tasks, and writes
          every file - with a live, running preview right in your browser.
          No local setup required.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={user ? "/dashboard" : "/sign-up"}
            className="rounded-md bg-primary px-6 py-3 font-medium hover:bg-primary-dark"
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
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-surface p-6"
            >
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
