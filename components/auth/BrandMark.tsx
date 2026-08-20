"use client";

import { useId, useRef, useState } from "react";

export default function BrandMark({
  size = 40,
  animated = true,
}: {
  size?: number;
  animated?: boolean;
}) {
  // Unique per-instance ids so multiple marks on one page (navbar + footer,
  // say) never collide on the same <defs> gradient/filter id.
  const uid = useId().replace(/[:]/g, "");
  const face = `bf-face-${uid}`;
  const edge = `bf-edge-${uid}`;
  const sheen = `bf-sheen-${uid}`;
  const glow = `bf-glow-${uid}`;
  const shadow = `bf-shadow-${uid}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 35 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    setTilt({
      rx: (0.5 - py) * 34,
      ry: (px - 0.5) * 38,
      mx: px * 100,
      my: py * 100,
    });
  }

  function handleLeave() {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 35 });
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={animated ? handleMove : undefined}
      onMouseLeave={animated ? handleLeave : undefined}
      style={{ width: size, height: size, perspective: 240 }}
      className="relative shrink-0"
    >
      {/* Ambient glow — sits behind the mark on its own layer so it stays
          put while the mark tilts, reading as light bouncing off a surface
          rather than moving with the object itself. */}
      <div
        aria-hidden="true"
        className={`absolute -inset-2 rounded-[14px] blur-md ${
          animated ? "animate-pulse" : ""
        }`}
        style={{
          background:
            "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 55%, #fb7185 100%)",
          opacity: 0.55,
        }}
      />

      <div
        className={`relative h-full w-full transition-transform duration-300 ease-out ${
          animated ? "animate-float-y" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
          style={{ transform: "translateZ(6px)" }}
          aria-hidden="true"
        >
          <defs>
            {/* Convex face gradient — light hits upper-left, falls off to
                the lower-right, like a domed/polished surface. */}
            <linearGradient id={face} x1="6" y1="3" x2="34" y2="37" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="45%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#e11d8f" />
            </linearGradient>
            {/* Darker edge/extrusion gradient for the slab peeking out
                bottom-right, simulating material thickness. */}
            <linearGradient id={edge} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <radialGradient id={sheen} cx={`${tilt.mx}%`} cy={`${tilt.my}%`} r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={glow} cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#050609" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Contact shadow pooling under the mark for grounding */}
          <ellipse cx="20" cy="35.5" rx="14" ry="3" fill={`url(#${glow})`} />

          {/* Extruded back slab — offset a couple px so it reads as
              thickness/depth behind the front face, not a flat icon. */}
          <rect x="4" y="4" width="36" height="36" rx="11" fill={`url(#${edge})`} />

          {/* Front face */}
          <g filter={`url(#${shadow})`}>
            <rect x="2" y="2" width="36" height="36" rx="11" fill={`url(#${face})`} />
            {/* Inner bevel ring — thin light rim top-left, dark rim
                bottom-right, the classic "raised button" cue. */}
            <rect
              x="2.75"
              y="2.75"
              width="34.5"
              height="34.5"
              rx="10.25"
              fill="none"
              stroke="white"
              strokeOpacity="0.35"
              strokeWidth="0.9"
            />
            <rect
              x="2"
              y="2"
              width="36"
              height="36"
              rx="11"
              fill="none"
              stroke="#050609"
              strokeOpacity="0.25"
              strokeWidth="1.4"
            />

            {/* Bracket / build glyph, embossed: a dark offset "carve"
                underneath a bright stroke on top gives the glyph real
                relief instead of sitting flat on the surface. */}
            <g transform="translate(0.5,0.9)" opacity="0.45">
              <path d="M14 12.5L8.5 20l5.5 7.5" stroke="#050609" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M26 12.5L31.5 20 26 27.5" stroke="#050609" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="20" r="2.4" fill="#050609" />
            </g>
            <path d="M14 12.5L8.5 20l5.5 7.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 12.5L31.5 20 26 27.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="20" cy="20" r="2.4" fill="white" />

            {/* Moving specular sheen — tracks the cursor so the surface
                genuinely looks like it's catching light as it tilts. */}
            <rect x="2" y="2" width="36" height="36" rx="11" fill={`url(#${sheen})`} style={{ mixBlendMode: "screen" }} />
          </g>
        </svg>
      </div>
    </div>
  );
}
