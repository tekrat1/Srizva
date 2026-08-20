"use client";

import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { MailWarning, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";

/**
 * Shown in the signed-in app shell for email/password accounts that
 * haven't verified their email yet. Google sign-ins never see this —
 * Google already verified that address.
 */
export default function VerifyEmailBanner({ email }: { email: string | null }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSent(true);
        toast.success("Verification email sent.");
      } else {
        toast.error("Please sign in again to resend the verification email.");
      }
    } catch {
      toast.error("Couldn't send the email — try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-aurora-amber/30 bg-aurora-amber/[0.08] px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5">
        <MailWarning className="h-4 w-4 shrink-0 text-aurora-amber" />
        <span className="text-foreground">
          Verify your email{email ? ` (${email})` : ""} to secure your account.
        </span>
      </div>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface disabled:opacity-60"
      >
        {sending && <Loader2 className="h-3 w-3 animate-spin" />}
        {sent ? "Sent — check your inbox" : sending ? "Sending..." : "Resend email"}
      </button>
    </div>
  );
}
