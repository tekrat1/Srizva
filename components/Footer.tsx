import Link from "next/link";
import BrandMark from "./auth/BrandMark";

const SUPPORT_EMAIL = "tekrat10@gmail.com";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-void/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground"
            >
              <BrandMark size={26} animated={false} />
              Srizva
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Describe what you want to build. An AI agent plans, codes, and
              previews your app - right in your browser.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-muted hover:text-foreground"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Srizva. All rights reserved.</p>
          <p>
            You must be at least 18 years old to create an account and use
            Srizva.
          </p>
        </div>
      </div>
    </footer>
  );
}
