/**
 * Kinetic Clockwork theme -- a single instrument dial styled as a real
 * clock face: 12 numeral positions around the rim, minute ticks, a
 * glowing progress ring for used/limit, and two hands that sweep
 * continuously via CSS (8s / 21s, never synced -- genuinely always
 * moving, not a static face). `variant` swaps the rim/glow color so
 * the left dial reads cool violet-blue and the right reads warm amber,
 * matching the two backlit gear clusters behind them.
 */
const NUMERALS = Array.from({ length: 12 }, (_, i) => {
  const label = i === 0 ? 12 : i;
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const r = 39;
  return { label, x: 60 + r * Math.cos(angle), y: 60 + r * Math.sin(angle) };
});

const TICKS = Array.from({ length: 60 });

export default function ClockworkDial({
  id,
  used,
  limit,
  label,
  variant = "violet",
}: {
  id: string;
  used: number;
  limit: number;
  label: string;
  variant?: "violet" | "amber";
}) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  const circumference = 2 * Math.PI * 47;
  const rim = variant === "violet" ? "#7c6bf0" : "#e8a33f";
  const face =
    variant === "violet"
      ? { from: "#171a2b", to: "#0a0b12" }
      : { from: "#241a10", to: "#100c08" };

  return (
    <div className="clockwork-dial">
      <div className="relative">
        <svg
          viewBox="0 0 120 120"
          className="h-[104px] w-[104px] sm:h-[124px] sm:w-[124px]"
          style={{ filter: `drop-shadow(0 0 14px ${rim}66)` }}
        >
          <defs>
            <radialGradient id={`df-${id}`} cx="42%" cy="38%" r="70%">
              <stop offset="0%" stopColor={face.from} />
              <stop offset="100%" stopColor={face.to} />
            </radialGradient>
          </defs>

          <circle cx="60" cy="60" r="57" fill="#1b1d22" />
          <circle cx="60" cy="60" r="54" fill={`url(#df-${id})`} stroke={rim} strokeWidth="1.4" opacity="0.95" />

          {/* progress ring -- how close to today's limit */}
          <circle
            cx="60"
            cy="60"
            r="47"
            fill="none"
            stroke={rim}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            transform="rotate(-90 60 60)"
            opacity="0.85"
          />

          {/* minute ticks */}
          {TICKS.map((_, i) => {
            const angle = (i / TICKS.length) * 360;
            const major = i % 5 === 0;
            return (
              <line
                key={i}
                x1="60"
                y1="10.5"
                x2="60"
                y2={major ? "15.5" : "13"}
                stroke={major ? "#c7cbd3" : "#5b5f68"}
                strokeWidth={major ? 1.3 : 0.7}
                opacity={major ? 0.8 : 0.45}
                transform={`rotate(${angle} 60 60)`}
              />
            );
          })}

          {/* numerals */}
          {NUMERALS.map((n) => (
            <text
              key={n.label}
              x={n.x}
              y={n.y + 2.5}
              textAnchor="middle"
              className="clockwork-dial-numeral"
            >
              {n.label}
            </text>
          ))}

          {/* two hands, always turning, never synced */}
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="34"
            stroke="#c7cbd3"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="clockwork-hand-slow"
          />
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="24"
            stroke={rim}
            strokeWidth="2.4"
            strokeLinecap="round"
            className="clockwork-hand-fast"
          />
          <circle cx="60" cy="60" r="3.6" fill={rim} />
        </svg>

        {/* digital readout, overlaid so it can glow via CSS text-shadow */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className={`clockwork-dial-value is-${variant}`}>
            {used}/{limit}
          </span>
          <span className="clockwork-dial-unit">builds</span>
        </div>
      </div>
      <span className="clockwork-dial-label">{label}</span>
    </div>
  );
}
