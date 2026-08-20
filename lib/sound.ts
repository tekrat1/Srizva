"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "srizva:sound-enabled";
const CHANGE_EVENT = "srizva:sound-changed";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  // Default on — the sound is meant to be discovered, not opted into.
  return stored === null ? true : stored === "1";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: enabled }));
}

/** Shared on/off state, kept in sync across every component that renders it. */
export function useSoundEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
    const onChange = (e: Event) => setEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  return [enabled, setSoundEnabled];
}

// ---- Tiny synthesized sound effects (Web Audio API — no asset files) ----

let sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  // Browsers suspend new AudioContexts until a user gesture — build events
  // are always the result of the person having just clicked "Generate" or
  // "Apply edit", so this resume is safe to call unconditionally.
  if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  { freq, duration, delay = 0, type = "sine", peakGain = 0.08 }: { freq: number; duration: number; delay?: number; type?: OscillatorType; peakGain?: number }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** A soft, quick "plink" — used on each file completing during a build. */
export function playPop() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, { freq: 720, duration: 0.09, type: "sine", peakGain: 0.06 });
  tone(ctx, { freq: 1080, duration: 0.07, delay: 0.02, type: "sine", peakGain: 0.03 });
}

/** A brighter little "splash" — used once when a whole build finishes. */
export function playSplash() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, { freq: 440, duration: 0.16, type: "sine", peakGain: 0.07 });
  tone(ctx, { freq: 660, duration: 0.16, delay: 0.05, type: "sine", peakGain: 0.06 });
  tone(ctx, { freq: 880, duration: 0.22, delay: 0.1, type: "sine", peakGain: 0.05 });
}
