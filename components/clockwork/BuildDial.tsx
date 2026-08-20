/** Instrument-style dial: ticked bezel + a brass progress ring, matching
 *  the circular gauges in the Kinetic Clockwork reference art. */
export default function BuildDial({
  used,
  limit,
  size = 116,
  label = "builds today",
}: {
  used: number;
  limit: number;
  size?: number;
  label?: string;
}) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct;

  return (
    <div
      className="clockwork-dial relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${used} of ${limit} ${label}`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="animate-dial-breathe">
        <defs>
          <linearGradient id="dial-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6d9a0" />
            <stop offset="100%" stopColor="#c98f3f" />
          </linearGradient>
          <radialGradient id="dial-face-grad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#1a1d24" />
            <stop offset="100%" stopColor="#0c0e12" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="48" fill="none" stroke="#3a2d18" strokeWidth="1" />
        <circle cx="50" cy="50" r="45" fill="url(#dial-face-grad)" stroke="#26201a" strokeWidth="2" />

        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          const rOuter = 43;
          const rInner = major ? 37 : 39.5;
          const x1 = 50 + rOuter * Math.cos(a);
          const y1 = 50 + rOuter * Math.sin(a);
          const x2 = 50 + rInner * Math.cos(a);
          const y2 = 50 + rInner * Math.sin(a);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={major ? "#e8a54b" : "#5a4a30"}
              strokeWidth={major ? 1.4 : 0.7}
              strokeLinecap="round"
            />
          );
        })}

        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(232,165,75,0.16)"
          strokeWidth="4"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#dial-ring-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-glitch-display text-lg font-bold leading-none text-clockwork-gold-light">
          {used}/{limit}
        </span>
        <span className="mt-1 text-[8.5px] uppercase tracking-[0.12em] text-clockwork-cream/50">
          {label}
        </span>
      </div>
    </div>
  );
}
