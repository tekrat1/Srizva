export default function BrandMark({
  size = 40,
  animated = true,
}: {
  size?: number;
  animated?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animated ? "animate-float-y" : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bf-grad" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      {/* Rounded square shell */}
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#bf-grad)" />
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="11"
        fill="url(#bf-grad)"
        opacity="0.35"
        className={animated ? "animate-pulse" : undefined}
      />
      {/* Bracket / build glyph */}
      <path
        d="M14 12.5L8.5 20l5.5 7.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 12.5L31.5 20 26 27.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="2.4" fill="white" />
    </svg>
  );
}
