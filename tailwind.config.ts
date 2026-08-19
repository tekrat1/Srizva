import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0d10",
        surface: "#14171c",
        border: "#22262d",
        primary: "#6366f1",
        "primary-dark": "#4f46e5",
        muted: "#8b8f97",
      },
    },
  },
  plugins: [],
};
export default config;
