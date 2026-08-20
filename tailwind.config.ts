import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens: driven by CSS variables so the same
        // utility classes (bg-background, bg-surface, text-muted, ...)
        // automatically flip between the dark and light variants
        // picked on the onboarding "Pick your style" step. See
        // globals.css for the variable definitions.
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        primary: "#6366f1",
        "primary-dark": "#4f46e5",
        // Aurora accent palette – used for the animated backdrop / brand
        // mark on the auth + onboarding + landing screens, which always
        // render on a dark canvas regardless of the app-wide theme.
        aurora: {
          cyan: "#22d3ee",
          violet: "#8b5cf6",
          rose: "#fb7185",
          amber: "#fbbf24",
        },
        void: "#050609",
        // Glitch Drop accent palette — hyperpop / CRT glitch direction
        // used on hero sections (landing + dashboard). Kept separate
        // from `aurora` so it never collides with the existing brand
        // gradient still used elsewhere.
        glitch: {
          ink: "#0A0A0D",
          magenta: "#FF2E9A",
          cyan: "#00F0FF",
          yellow: "#E8FF3C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        "glitch-display": ["var(--font-glitch-display)", "sans-serif"],
        "glitch-mono": ["var(--font-glitch-mono)", "monospace"],
      },
      keyframes: {
        "orbit-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "orbit-spin-reverse": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(-360deg)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-5%, 4%) scale(0.95)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.9" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "orbit-slow": "orbit-spin 70s linear infinite",
        "orbit-slower": "orbit-spin 100s linear infinite",
        "orbit-reverse-slow": "orbit-spin-reverse 70s linear infinite",
        "orbit-reverse-slower": "orbit-spin-reverse 100s linear infinite",
        "blob-drift": "blob-drift 18s ease-in-out infinite",
        "blob-drift-slow": "blob-drift 26s ease-in-out infinite",
        twinkle: "twinkle 3.5s ease-in-out infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "pop-in": "pop-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
