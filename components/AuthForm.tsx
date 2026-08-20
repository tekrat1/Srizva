"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { createSessionCookie } from "@/lib/actions/auth";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const credential =
        mode === "sign-up"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      const idToken = await credential.user.getIdToken();
      await createSessionCookie(idToken);

      if (mode === "sign-up") {
        // Brand-new account — walk them through the step-by-step
        // onboarding (style, name, role, company size) before they
        // land on the dashboard.
        router.push("/onboarding");
      } else {
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
      }
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          {mode === "sign-up" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "sign-up"
            ? "A few seconds and you're building."
            : "Pick up right where you left off."}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-muted">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-background/80 py-2.5 pl-9 pr-3 outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-muted">Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-border bg-background/80 py-2.5 pl-9 pr-10 outline-none transition-colors focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-aurora group flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white transition-[background-position,opacity] duration-500 hover:animate-shimmer disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading
          ? "Please wait..."
          : mode === "sign-up"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-white hover:text-primary">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-white hover:text-primary">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
