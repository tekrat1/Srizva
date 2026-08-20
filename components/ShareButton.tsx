"use client";

import { useState, useTransition } from "react";
import { Share2, Check, Copy, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { setProjectSharing } from "@/lib/actions/projects";

export default function ShareButton({
  projectId,
  initialIsPublic,
  initialShareId,
}: {
  projectId: string;
  initialIsPublic?: boolean;
  initialShareId?: string;
}) {
  const [isPublic, setIsPublic] = useState(!!initialIsPublic);
  const [shareId, setShareId] = useState(initialShareId ?? null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const shareUrl =
    shareId && typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareId}`
      : null;

  function toggleSharing(next: boolean) {
    startTransition(async () => {
      const result = await setProjectSharing(projectId, next);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setIsPublic(result.isPublic);
      setShareId(result.shareId);
      if (result.isPublic) toast.success("Public link is live");
      else toast.success("Link disabled — no longer viewable");
    });
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-white/5 ${
          isPublic ? "text-aurora-cyan" : ""
        }`}
      >
        <Share2 className="h-3.5 w-3.5" />
        {isPublic ? "Shared" : "Share"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium">
              {isPublic ? (
                <Globe className="h-3.5 w-3.5 text-aurora-cyan" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted" />
              )}
              {isPublic ? "Anyone with the link can view" : "Only you can view this"}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => toggleSharing(!isPublic)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                isPublic ? "bg-aurora-violet" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {isPublic && shareUrl && (
            <div className="mt-3 flex items-center gap-1.5">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full truncate rounded-md border border-border bg-black/20 px-2 py-1.5 text-[11px] text-muted outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                title="Copy link"
                className="flex shrink-0 items-center justify-center rounded-md border border-border p-1.5 hover:bg-white/5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          <p className="mt-2 text-[10px] leading-snug text-muted/70">
            Sends a live, read-only preview — no export needed. They won&apos;t see your code or be able to edit it.
          </p>
        </div>
      )}
    </div>
  );
}
