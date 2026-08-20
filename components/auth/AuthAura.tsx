// Deterministic pseudo-random generator (mulberry32) so the star field
// renders identically on the server and the client — no hydration
// mismatch, no need for a client-only effect just to scatter dots.
function seeded(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(1337);
const STARS = Array.from({ length: 60 }).map((_, i) => ({
  id: i,
  top: rand() * 100,
  left: rand() * 100,
  size: rand() * 1.6 + 0.6,
  delay: rand() * 4,
  duration: 2.5 + rand() * 3,
}));

type Satellite = {
  label: string;
  tint: string;
  lines: number;
};

const RING_ONE: Satellite[] = [
  { label: "Portfolio", tint: "from-aurora-cyan/70 to-aurora-violet/70", lines: 3 },
  { label: "Dashboard", tint: "from-aurora-violet/70 to-aurora-rose/70", lines: 4 },
  { label: "Storefront", tint: "from-aurora-rose/70 to-aurora-amber/70", lines: 3 },
];

const RING_TWO: Satellite[] = [
  { label: "Landing", tint: "from-aurora-amber/60 to-aurora-cyan/60", lines: 2 },
  { label: "Blog", tint: "from-aurora-cyan/60 to-aurora-rose/60", lines: 4 },
  { label: "SaaS", tint: "from-aurora-violet/60 to-aurora-cyan/60", lines: 3 },
  { label: "Docs", tint: "from-aurora-rose/60 to-aurora-violet/60", lines: 3 },
];

function MiniPreview({ sat }: { sat: Satellite }) {
  return (
    <div className="w-[132px] rounded-xl border border-white/10 bg-surface/80 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="flex items-center gap-1 border-b border-white/5 px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        <span className="ml-auto text-[8px] font-medium tracking-wide text-white/40">
          {sat.label}
        </span>
      </div>
      <div className={`space-y-1.5 bg-gradient-to-br ${sat.tint} p-2.5`}>
        {Array.from({ length: sat.lines }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-white/70"
            style={{ width: `${85 - i * 14}%`, opacity: 0.85 - i * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}

function OrbitRing({
  satellites,
  radius,
  duration,
  reverse = false,
}: {
  satellites: Satellite[];
  radius: number;
  duration: number;
  reverse?: boolean;
}) {
  const count = satellites.length;
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: 0,
        height: 0,
        animation: `${reverse ? "orbit-spin-reverse" : "orbit-spin"} ${duration}s linear infinite`,
      }}
    >
      {satellites.map((sat, i) => {
        const angle = (360 / count) * i;
        return (
          <div
            key={sat.label}
            className="absolute left-0 top-0"
            style={{
              transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`,
            }}
          >
            <div
              style={{
                animation: `${reverse ? "orbit-spin" : "orbit-spin-reverse"} ${duration}s linear infinite`,
              }}
            >
              <MiniPreview sat={sat} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AuthAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-void">
      {/* base gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#101422_0%,_#050609_60%)]" />

      {/* drifting aurora blobs */}
      <div className="absolute left-[8%] top-[12%] h-[26rem] w-[26rem] animate-blob-drift rounded-full bg-aurora-violet/25 blur-[110px]" />
      <div className="absolute right-[10%] top-[22%] h-[22rem] w-[22rem] animate-blob-drift-slow rounded-full bg-aurora-cyan/20 blur-[110px]" />
      <div className="absolute bottom-[6%] left-[30%] h-[24rem] w-[24rem] animate-blob-drift rounded-full bg-aurora-rose/20 blur-[120px]" />

      {/* star field */}
      <div className="absolute inset-0">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute animate-twinkle rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* orbiting site previews — pushed out toward the corners (see
          aurora-fade) and hidden on small/medium screens to keep the
          form legible on mobile */}
      <div className="aurora-fade absolute inset-0 hidden lg:block">
        <OrbitRing satellites={RING_ONE} radius={300} duration={50} />
        <OrbitRing satellites={RING_TWO} radius={470} duration={76} reverse />
      </div>

      <div className="bg-grain" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void" />
    </div>
  );
}
