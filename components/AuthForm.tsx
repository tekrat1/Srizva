"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  sendEmailVerification,
} from "firebase/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { createSessionCookie } from "@/lib/actions/auth";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Only relevant in sign-up mode — existing users already agreed once.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Honeypot: a field real users never see or fill in (visually hidden +
  // tabIndex -1 + autoComplete off), but naive bots that auto-fill every
  // input will populate it. If it's non-empty on submit, silently no-op
  // instead of telling the bot it was caught.
  const [honeypot, setHoneypot] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (honeypot) return; // bot — bail out quietly

    if (mode === "sign-up" && !agreedToTerms) {
      toast.error(
        "Please confirm you're 18+ and agree to the Terms and Privacy Policy."
      );
      return;
    }

    setLoading(true);

    try {
      const credential =
        mode === "sign-up"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      const idToken = await credential.user.getIdToken();
      await createSessionCookie(idToken);

      if (mode === "sign-up") {
        // Fire-and-forget — don't block onboarding on the email round trip.
        sendEmailVerification(credential.user).catch(() => {});
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

  async function handleGoogleSignIn() {
    if (honeypot) return; // bot — bail out quietly

    if (mode === "sign-up" && !agreedToTerms) {
      toast.error(
        "Please confirm you're 18+ and agree to the Terms and Privacy Policy."
      );
      return;
    }

    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;

      const idToken = await result.user.getIdToken();
      await createSessionCookie(idToken);

      if (isNewUser) {
        // First time we've seen this Google account — same onboarding
        // flow as a fresh email sign-up.
        router.push("/onboarding");
      } else {
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
      }
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      // Don't scare the person with an error toast if they just closed
      // the Google popup on purpose.
      if (!message.includes("popup-closed-by-user")) {
        toast.error(message.replace("Firebase: ", ""));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from real users, catches basic form-filling bots.
          aria-hidden + tabIndex=-1 + off-screen so screen readers and
          keyboard users never encounter it. */}
      <div aria-hidden="true" className="absolute left-[-9999px]" style={{ opacity: 0 }}>
        <label htmlFor="company-website">Company website</label>
        <input
          id="company-website"
          name="company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

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
        {mode === "sign-up" && <PasswordStrengthMeter password={password} />}
        {mode === "sign-in" && (
          <div className="mt-1.5 text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-muted hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}
      </div>

      {mode === "sign-up" && (
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-background/80 accent-primary"
          />
          <span>
            I confirm I&apos;m at least 18 years old and agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-white hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-white hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={loading || (mode === "sign-up" && !agreedToTerms)}
        className="btn-aurora group flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white transition-[background-position,opacity] duration-500 hover:animate-shimmer disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading
          ? "Please wait..."
          : mode === "sign-up"
            ? "Create account"
            : "Sign in"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={
          loading || googleLoading || (mode === "sign-up" && !agreedToTerms)
        }
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background/80 py-2.5 font-medium transition-colors hover:bg-surface disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
        )}
        {googleLoading ? "Please wait..." : "Continue with Google"}
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
