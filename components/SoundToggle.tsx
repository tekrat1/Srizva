"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSoundEnabled } from "@/lib/sound";

export default function SoundToggle() {
  const [enabled, setEnabled] = useSoundEnabled();

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={enabled ? "Mute build sounds" : "Unmute build sounds"}
      aria-label={enabled ? "Mute build sounds" : "Unmute build sounds"}
      aria-pressed={enabled}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
