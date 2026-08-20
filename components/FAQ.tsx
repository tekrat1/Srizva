const FAQS: { q: string; a: string }[] = [
  {
    q: "Is my code and my prompts private?",
    a: "Yes. Your prompts and generated projects are tied to your account and aren't shared with other users. See our Privacy Policy for exactly what we collect and how it's used.",
  },
  {
    q: "Can I export or download what I build?",
    a: "Yes — every project has a download option so you can take the generated code with you and run it anywhere, no lock-in.",
  },
  {
    q: "What happens after I use my free build for the day?",
    a: "Your daily free generation resets on a 24-hour cycle. You can still open, edit, and download projects you've already built — the limit only applies to starting a brand-new generation.",
  },
  {
    q: "Is the code production-ready?",
    a: "AI-generated code can contain mistakes. Treat it as a strong starting point — review, test, and harden it before shipping to production, especially for anything handling real user data.",
  },
  {
    q: "Do I need to know how to code to use Srizva?",
    a: "No. Describe what you want in plain English and the AI agents plan, build, and preview it for you. Knowing some code helps if you want to fine-tune the result, but it's not required.",
  },
  {
    q: "Is Srizva finished / stable?",
    a: "Srizva is still in active production. Core generation and preview work today; more features (higher tiers, more integrations) are on the way. Check the Status page for what's shipped and what's next.",
  },
];

export default function FAQ() {
  return (
    <section className="mx-auto mt-24 max-w-3xl px-6">
      <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-white/10 bg-surface/60 p-5 backdrop-blur-sm open:border-white/20"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground marker:content-none">
              {item.q}
              <span className="shrink-0 text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
