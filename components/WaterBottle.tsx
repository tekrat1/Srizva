"use client";

import { useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import { BOTTLE_ML } from "@/lib/water";

export type BottlePhase = "idle" | "generating" | "editing" | "done" | "error";

const CAPTIONS: Record<BottlePhase, string> = {
  idle: "Full bottle. Ready when you are.",
  generating: "Brewing your app… yes, this is that meme.",
  editing: "Topping up the edit…",
  done: "Bottle's empty. Your app isn't.",
  error: "Spilled a little. Try again?",
};

// Re-exported for back-compat with existing imports elsewhere in the app
// (`import { BOTTLE_ML } from "./WaterBottle"`) — the source of truth now
// lives in lib/water.ts so server code can use it too.
export { BOTTLE_ML };

const BUBBLES = [
  { left: "22%", delay: "0s", size: 5 },
  { left: "48%", delay: "0.9s", size: 4 },
  { left: "68%", delay: "1.7s", size: 6 },
  { left: "36%", delay: "2.4s", size: 3 },
];

export default function WaterBottle({
  progress,
  phase,
}: {
  /** 1 = full bottle, 0 = fully drained */
  progress: number;
  phase: BottlePhase;
}) {
  const level = Math.min(1, Math.max(0, progress));
  const active = phase === "generating" || phase === "editing";

  // Smoothly count the "mL used" stat down alongside the water level
  // instead of snapping, so it reads as a live meter rather than a label.
  const [displayLevel, setDisplayLevel] = useState(level);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayLevel(level));
    return () => cancelAnimationFrame(raf);
  }, [level]);

  const mlLeft = Math.round(BOTTLE_ML * displayLevel);

  return (
    <div className="pointer-events-none flex select-none flex-col items-center gap-3">
      <div
        className={`relative flex flex-col items-center ${
          phase === "idle" ? "animate-float-y" : ""
        }`}
      >
        {/* cap */}
        <div
          className={`z-10 h-3 w-6 rounded-t-sm border border-border bg-gradient-to-b from-aurora-violet to-aurora-rose shadow-sm ${
            active ? "bottle-cap-active" : ""
          }`}
        />
        {/* neck */}
        <div className="z-10 h-3 w-4 border-x border-border bg-surface/60" />

        {/* body */}
        <div
          className="relative h-36 w-16 overflow-hidden border border-border bg-surface/40 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-[1px]"
          style={{
            clipPath:
              "polygon(28% 0%, 72% 0%, 100% 14%, 100% 96%, 88% 100%, 12% 100%, 0% 96%, 0% 14%)",
          }}
        >
          {/* water */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ height: `${level * 100}%` }}
          >
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-aurora-cyan to-aurora-violet">
              <div className="wave-layer wave-layer-1" />
              <div className="wave-layer wave-layer-2" />

              {active &&
                BUBBLES.map((b, i) => (
                  <span
                    key={i}
                    className="bottle-bubble absolute bottom-1 rounded-full bg-white/70"
                    style={{
                      left: b.left,
                      width: b.size,
                      height: b.size,
                      animationDelay: b.delay,
                    }}
                  />
                ))}
            </div>
          </div>

          {/* glass shine */}
          <div className="pointer-events-none absolute inset-y-1 left-1.5 w-1.5 rounded-full bg-white/25" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
        </div>

        {/* condensation drips while active */}
        {active && (
          <>
            <span className="bottle-drip absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-aurora-cyan/70" />
            <span
              className="bottle-drip absolute bottom-4 right-3 h-1 w-1 rounded-full bg-aurora-cyan/60"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
        <Droplets className="h-3 w-3 text-aurora-cyan" />
        <span>{mlLeft} mL left</span>
      </div>

      <p className="max-w-[9rem] text-center text-[10px] leading-snug text-muted/80">
        {CAPTIONS[phase]}
      </p>
    </div>
  );
}
