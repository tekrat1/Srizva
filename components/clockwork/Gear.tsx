/**
 * Kinetic Clockwork theme — a single brass/gold cog.
 *
 * Teeth are real geometry (computed, not a background image), shaded with
 * a radial gradient + drop shadow so the disc reads as machined metal
 * rather than a flat icon, then spun with the existing orbit-spin /
 * orbit-spin-reverse keyframes from globals.css.
 */
import type { CSSProperties } from "react";

function gearPath(teeth: number, outerR: number, rootR: number, toothWidth = 0.42): string {
  const step = (Math.PI * 2) / teeth;
  const half = (step * toothWidth) / 2;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const center = i * step;
    const a0 = center - step / 2 + (step - half * 2) / 2;
    const a1 = center - half;
    const a2 = center + half;
    const a3 = center + step / 2 - (step - half * 2) / 2;
    const pt = (r: number, a: number): [number, number] => [
      r * Math.cos(a),
      r * Math.sin(a),
    ];
    const [x0, y0] = pt(rootR, a0);
    const [x1, y1] = pt(outerR, a1);
    const [x2, y2] = pt(outerR, a2);
    const [x3, y3] = pt(rootR, a3);
    d += `${i === 0 ? "M" : "L"} ${x0.toFixed(2)} ${y0.toFixed(2)} `;
    d += `L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} `;
  }
  d += "Z";
  return d;
}

type GearProps = {
  teeth?: number;
  size?: number;
  duration?: string;
  reverse?: boolean;
  spokes?: number;
  tone?: "gold" | "bronze" | "steel";
  className?: string;
  style?: CSSProperties;
};

const TONES: Record<
  NonNullable<GearProps["tone"]>,
  { hi: string; mid: string; low: string; hub: string; stroke: string }
> = {
  gold: { hi: "#fbe3ac", mid: "#e8a54b", low: "#7a4c1e", hub: "#2c1c0c", stroke: "#3a2410" },
  bronze: { hi: "#e7c48c", mid: "#a8622f", low: "#4f2f14", hub: "#221408", stroke: "#2e1a0a" },
  steel: { hi: "#eef2f6", mid: "#9aa4b2", low: "#454e5a", hub: "#1b1f26", stroke: "#20242c" },
};

let uid = 0;

export default function Gear({
  teeth = 14,
  size = 160,
  duration = "40s",
  reverse = false,
  spokes = 5,
  tone = "gold",
  className,
  style,
}: GearProps) {
  const outerR = 46;
  const rootR = 37;
  const holeR = 13;
  const id = `gear-${(uid++).toString(36)}`;
  const c = TONES[tone];
  const d = gearPath(teeth, outerR, rootR);

  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{
        animation: `${reverse ? "orbit-spin-reverse" : "orbit-spin"} ${duration} linear infinite`,
        filter: `drop-shadow(0 6px 14px rgba(0,0,0,0.55))`,
        ...style,
      }}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="45%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.low} />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="100%" stopColor={c.low} />
        </linearGradient>
      </defs>

      <path d={d} fill={`url(#${id}-face)`} stroke={c.stroke} strokeWidth="1.1" />
      <circle r={rootR - 5} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
      <circle
        r={rootR - 5}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
        transform="translate(-0.6,-0.6)"
      />

      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2 + Math.PI / spokes;
        const x2 = (rootR - 9) * Math.cos(a);
        const y2 = (rootR - 9) * Math.sin(a);
        return (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={x2}
            y2={y2}
            stroke="rgba(0,0,0,0.28)"
            strokeWidth={7}
            strokeLinecap="round"
          />
        );
      })}

      <circle r={holeR + 3} fill={`url(#${id}-rim)`} stroke={c.stroke} strokeWidth="1" />
      <circle r={holeR} fill={c.hub} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
      <circle r={holeR - 5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  );
}
