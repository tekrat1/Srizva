"use client";

import { Sparkles } from "lucide-react";

export interface StarterPrompt {
  label: string;
  emoji: string;
  prompt: string;
}

// A handful of prompts spanning different app shapes, so the gallery reads
// as "here's what's possible" rather than one narrow example repeated.
// Deliberately left a little underspecified — the point is to give people
// something to tap and tweak, not a finished spec.
export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    label: "Pomodoro timer",
    emoji: "⏱️",
    prompt: "A pomodoro timer app with a clean minimal UI, session history, and a soft chime on each break",
  },
  {
    label: "Habit tracker",
    emoji: "✅",
    prompt: "A daily habit tracker with a streak counter, checkboxes for each habit, and a weekly progress grid",
  },
  {
    label: "Recipe finder",
    emoji: "🍳",
    prompt: "A recipe app where you type ingredients you have and get matching recipe ideas with steps",
  },
  {
    label: "Portfolio site",
    emoji: "💼",
    prompt: "A one-page personal portfolio site with a hero section, project cards, and a contact form",
  },
  {
    label: "Expense splitter",
    emoji: "🧾",
    prompt: "A group expense splitter where you add people and expenses and it calculates who owes who",
  },
  {
    label: "Markdown notes",
    emoji: "📝",
    prompt: "A simple notes app with a markdown editor on the left and a live rendered preview on the right",
  },
];

export default function PromptGallery({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Sparkles className="h-3.5 w-3.5 text-aurora-violet" />
        Not sure what to build? Tap one to start, then tweak it.
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {STARTER_PROMPTS.map((sp) => (
          <button
            key={sp.label}
            type="button"
            onClick={() => onSelect(sp.prompt)}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface/60 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-aurora-violet/50 hover:shadow-[0_8px_24px_rgba(139,92,246,0.15)]"
          >
            <span className="text-lg leading-none">{sp.emoji}</span>
            <span className="text-xs font-medium text-foreground">{sp.label}</span>
            <span className="line-clamp-2 text-[11px] leading-snug text-muted">
              {sp.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
