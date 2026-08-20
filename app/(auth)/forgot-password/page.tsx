"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      // Always show success, even if the email doesn't exist — this is
      // standard practice so the form can't be used to check which
      // emails have accounts.
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      // Firebase throws auth/invalid-email for malformed addresses — that's
      // fine to surface. Anything else, still show the generic success
      // state so we don't leak account existence.
      if (message.includes("invalid-email")) {
        toast.error("Enter a valid email address.");
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="text-foreground">{email}</span>,
            we&apos;ve sent a link to reset your password.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-sm text-white hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we&apos;ll send you a reset link.
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

      <button
        type="submit"
        disabled={loading}
        className="btn-aurora group flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white transition-[background-position,opacity] duration-500 hover:animate-shimmer disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-white hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
