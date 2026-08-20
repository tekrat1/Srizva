"use client";

/**
 * Lightweight, dependency-free password strength estimate.
 * Not a replacement for a real zxcvbn-style check — just enough signal
 * to nudge people away from "123456" before they hit Firebase's rejection.
 */
function scorePassword(password: string): number {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return Math.min(score, 4); // 0-4
}

const LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const BAR_COLORS = [
  "bg-rose-500",
  "bg-rose-500",
  "bg-amber-400",
  "bg-aurora-cyan",
  "bg-emerald-400",
];

export default function PasswordStrengthMeter({
  password,
}: {
  password: string;
}) {
  if (!password) return null;

  const score = scorePassword(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? BAR_COLORS[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      <p
        className={`mt-1 text-xs ${
          score <= 1
            ? "text-rose-400"
            : score === 2
              ? "text-amber-400"
              : "text-emerald-400"
        }`}
      >
        {LABELS[score]}
        {score <= 1 && " — try adding a number, a symbol, or more length"}
      </p>
    </div>
  );
}
