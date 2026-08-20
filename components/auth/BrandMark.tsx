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
        <radialGradient id="bm-face" cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#fbe3ac" />
          <stop offset="45%" stopColor="#e8a54b" />
          <stop offset="100%" stopColor="#7a4c1e" />
        </radialGradient>
      </defs>
      {/* 8-tooth cog */}
      <path
        d="M20 3.2 22.4 3.2 23.1 7.4C24.4 7.7 25.6 8.2 26.7 8.9L30.2 6.5 32.9 8.3 31.4 12.3C32.3 13.3 33 14.4 33.6 15.6L37.8 15.9 38.4 18.9 34.7 20.9C34.7 22.2 34.5 23.4 34.2 24.6L37.4 27.4 36.1 30.1 31.9 29.4C31.1 30.4 30.2 31.3 29.1 32.1L29.8 36.3 27.1 37.7 24.5 34.5C23.3 34.8 22.1 35 20.9 35L19.2 38.8 16.2 38.6 15.5 34.4C14.2 34.1 13 33.6 11.9 32.9L8.4 35.3 5.7 33.5 7.2 29.5C6.3 28.5 5.6 27.4 5 26.2L0.8 25.9 0.2 22.9 3.9 20.9C3.9 19.6 4.1 18.4 4.4 17.2L1.2 14.4 2.5 11.7 6.7 12.4C7.5 11.4 8.4 10.5 9.5 9.7L8.8 5.5 11.5 4.1 14.1 7.3C15.3 7 16.5 6.8 17.7 6.8Z"
        fill="url(#bm-face)"
        stroke="#3a2410"
        strokeWidth="0.8"
        transform="translate(0.3,0.3) scale(0.98)"
      />
      <circle cx="20" cy="20" r="9.5" fill="url(#bm-face)" stroke="#3a2410" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="4.2" fill="#1c1108" stroke="#2c1c0c" strokeWidth="1" />
      <circle cx="20" cy="20" r="1.6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.7" />
    </svg>
  );
}
