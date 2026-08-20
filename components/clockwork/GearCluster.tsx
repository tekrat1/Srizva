import Gear from "./Gear";

/**
 * A trio of overlapping cogs sized/positioned to look like they're
 * meshing. Corners are swapped via `flip` so the same cluster can sit
 * top-left or bottom-right without mirrored artwork.
 */
export default function GearCluster({
  flip = false,
  opacity = 1,
  className = "",
}: {
  flip?: boolean;
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity, transform: flip ? "scaleX(-1) scaleY(-1)" : undefined }}
    >
      <div className="relative h-[340px] w-[340px]">
        <Gear
          teeth={22}
          size={240}
          duration="90s"
          tone="gold"
          spokes={6}
          className="absolute -left-16 -top-16"
        />
        <Gear
          teeth={14}
          size={140}
          duration="46s"
          reverse
          tone="bronze"
          spokes={5}
          className="absolute left-32 top-24"
        />
        <Gear
          teeth={10}
          size={86}
          duration="26s"
          tone="steel"
          spokes={4}
          className="absolute left-8 top-[188px]"
        />
      </div>
    </div>
  );
}
