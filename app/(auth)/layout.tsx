import Link from "next/link";
import AuthAura from "@/components/auth/AuthAura";
import BrandMark from "@/components/auth/BrandMark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
      <AuthAura />

      <div className="relative z-10 flex w-full flex-col items-center">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 text-lg font-semibold tracking-tight animate-fade-up"
        >
          <BrandMark size={34} />
          Buildify
        </Link>

        <div className="w-full max-w-sm animate-pop-in rounded-2xl border border-white/10 bg-surface/70 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {children}
        </div>

        <p className="mt-8 max-w-xs text-center text-xs text-muted animate-fade-up [animation-delay:150ms]">
          Every prompt spins up a plan, a build, and a live preview — no
          local setup, ever.
        </p>
      </div>
    </div>
  );
}
