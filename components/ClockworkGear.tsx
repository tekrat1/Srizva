/**
 * Kinetic Clockwork theme -- a single rotating gear, drawn as real SVG
 * geometry (not a flat icon): teeth are computed points, the face uses a
 * metal gradient (dark rim -> lighter mid -> dark hub) so it reads as
 * dimensional, and an optional `glow` color adds a soft rim-light behind
 * it (violet on the left cluster, amber on the right -- matching the
 * reference render). Spins continuously and smoothly via CSS.
 *
 * Stays a server component (no "use client", no useId) -- callers pass a
 * stable `id` string so each instance's gradient defs get a unique id
 * without needing client-side hooks.
 */
function gearPath(teeth: number, outerR: number, innerR: number) {
  const total = teeth * 2;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = (50 + r * Math.cos(angle)).toFixed(2);
    const y = (50 + r * Math.sin(angle)).toFixed(2);
    pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ") + " Z";
}

export default function ClockworkGear({
  id,
  size = 120,
  teeth = 12,
  shade = "steel",
  glow,
  duration = 24,
  reverse = false,
  className = "",
  opacity = 1,
}: {
  /** Unique string per instance, used to namespace this gear's gradient ids. */
  id: string;
  size?: number;
  teeth?: number;
  /** Base metal tone. "steel" = cool gray, "bronze" = warm copper/gold. */
  shade?: "steel" | "bronze";
  /** Optional rim-light color glowing behind the gear (e.g. "#7c6bf0" or "#e8a33f"). */
  glow?: string;
  duration?: number;
  reverse?: boolean;
  className?: string;
  opacity?: number;
}) {
  const d = gearPath(teeth, 46, 36);

  const stops =
    shade === "bronze"
      ? { dark: "#4a3a22", mid: "#a9803f", light: "#e3c07f", hub: "#2a2011" }
      : { dark: "#2b2f36", mid: "#767c86", light: "#c3c8d1", hub: "#16181c" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{
        animation: `${reverse ? "clockwork-spin-ccw" : "clockwork-spin-cw"} ${duration}s linear infinite`,
        opacity,
        filter: glow ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${glow})` : undefined,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`gm-${id}`} x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={stops.light} />
          <stop offset="45%" stopColor={stops.mid} />
          <stop offset="100%" stopColor={stops.dark} />
        </linearGradient>
        <radialGradient id={`gh-${id}`} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor={stops.mid} />
          <stop offset="100%" stopColor={stops.hub} />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#gm-${id})`} stroke={stops.dark} strokeWidth="0.6" />
      <circle cx="50" cy="50" r="25" fill={`url(#gh-${id})`} stroke={stops.dark} strokeWidth="1.4" />
      {[0, 90, 180, 270].map((a) => (
        <rect
          key={a}
          x="47"
          y="23"
          width="6"
          height="16"
          rx="2"
          fill={stops.mid}
          opacity="0.7"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7" fill={stops.hub} stroke={stops.light} strokeWidth="0.8" opacity="0.9" />
    </svg>
  );
}
