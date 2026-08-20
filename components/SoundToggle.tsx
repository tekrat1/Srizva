"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSoundEnabled } from "@/lib/sound";

export default function SoundToggle({
  variant = "desktop",
}: {
  /** "mobile" gives a full-width, thumb-sized row for the slide-down sheet. */
  variant?: "desktop" | "mobile";
}) {
  const [enabled, setEnabled] = useSoundEnabled();

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        aria-label={enabled ? "Mute build sounds" : "Unmute build sounds"}
        aria-pressed={enabled}
        className="tap flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-muted active:bg-white/10 active:text-aurora-cyan"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </span>
        {enabled ? "Mute build sounds" : "Unmute build sounds"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={enabled ? "Mute build sounds" : "Unmute build sounds"}
      aria-label={enabled ? "Mute build sounds" : "Unmute build sounds"}
      aria-pressed={enabled}
      className="tap tap-sm rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-white/10 hover:text-aurora-cyan active:bg-white/15"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </button>
  );
}
