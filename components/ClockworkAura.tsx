import ClockworkGear from "./ClockworkGear";

/**
 * Kinetic Clockwork theme -- background. A dark machine-room gradient
 * with two overlapping gear clusters, each backlit with its own rim
 * color (cool violet-blue on the left, warm amber-gold on the right),
 * matching the reference render. Every gear turns continuously at a
 * different speed/direction via CSS -- this is real, always-on motion,
 * not a static illustration.
 */
export default function ClockworkAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#07080a]">
      {/* base machine-room gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#14161b_0%,_#0a0b0d_55%,_#050506_100%)]" />

      {/* faint brass blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#c9a24a 1px, transparent 1px), linear-gradient(90deg, #c9a24a 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      {/* -- left cluster: cool violet/blue backlight -- */}
      <div className="absolute -left-16 top-[6%] h-[26rem] w-[26rem] rounded-full bg-[#6a5cf5]/[0.16] blur-[110px]" />
      <ClockworkGear
        id="l1"
        size={300}
        teeth={16}
        shade="steel"
        glow="#6a5cf5"
        duration={64}
        opacity={0.92}
        className="absolute -left-24 -top-16"
      />
      <ClockworkGear
        id="l2"
        size={170}
        teeth={11}
        shade="bronze"
        glow="#8b7bf7"
        duration={38}
        reverse
        opacity={0.85}
        className="absolute left-[6%] top-[24%]"
      />
      <ClockworkGear
        id="l3"
        size={110}
        teeth={8}
        shade="steel"
        duration={20}
        opacity={0.6}
        className="absolute -left-4 bottom-[6%]"
      />
      <ClockworkGear
        id="l4"
        size={80}
        teeth={8}
        shade="steel"
        duration={16}
        reverse
        opacity={0.45}
        className="absolute left-[22%] bottom-[2%]"
      />

      {/* -- right cluster: warm amber/gold backlight -- */}
      <div className="absolute -right-16 top-[4%] h-[26rem] w-[26rem] rounded-full bg-[#e8a33f]/[0.16] blur-[110px]" />
      <ClockworkGear
        id="r1"
        size={300}
        teeth={16}
        shade="steel"
        glow="#e8a33f"
        duration={58}
        reverse
        opacity={0.92}
        className="absolute -right-24 -top-14"
      />
      <ClockworkGear
        id="r2"
        size={160}
        teeth={11}
        shade="bronze"
        glow="#e8a33f"
        duration={34}
        opacity={0.85}
        className="absolute right-[7%] top-[26%]"
      />
      <ClockworkGear
        id="r3"
        size={100}
        teeth={8}
        shade="steel"
        duration={18}
        reverse
        opacity={0.55}
        className="absolute right-[2%] bottom-[8%]"
      />

      {/* central amber engine glow behind the headline */}
      <div className="absolute left-1/2 top-[34%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9752f]/[0.08] blur-[130px]" />

      {/* vignette so foreground text/cards stay legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050506]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_transparent_30%,_rgba(4,4,5,0.65)_100%)]" />
    </div>
  );
}
