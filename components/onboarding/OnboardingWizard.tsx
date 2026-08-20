"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Building2,
  Loader2,
  Megaphone,
  Moon,
  PenTool,
  Rocket,
  Settings2,
  Sun,
  Terminal,
  User,
  Users,
} from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { createSessionCookie } from "@/lib/actions/auth";
import { completeOnboarding, type Theme } from "@/lib/actions/onboarding";
import BrandMark from "@/components/auth/BrandMark";

const ROLES = [
  { id: "founder", label: "Founder", icon: Rocket },
  { id: "product", label: "Product", icon: Briefcase },
  { id: "designer", label: "Designer", icon: PenTool },
  { id: "engineer", label: "Engineer", icon: Terminal },
  { id: "consultant", label: "Consultant", icon: Building },
  { id: "marketing", label: "Marketing / Sales", icon: Megaphone },
  { id: "operations", label: "Operations", icon: Settings2 },
  { id: "other", label: "Other", icon: User },
] as const;

const COMPANY_SIZES = [
  { id: "solo", label: "Solo", icon: User },
  { id: "2-20", label: "2 - 20", icon: Users },
  { id: "21-200", label: "21 - 200", icon: Building },
  { id: "200+", label: "200+", icon: Building2 },
] as const;

const STEP_COUNT = 4;

export default function OnboardingWizard({
  initialName,
}: {
  initialName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState<string | null>(null);

  const canAdvance =
    step === 0 ? true : step === 1 ? name.trim().length > 0 : step === 2 ? !!role : !!companySize;

  const isLastStep = step === STEP_COUNT - 1;

  function goNext() {
    if (!canAdvance) return;
    if (isLastStep) {
      void handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleFinish() {
    if (!role || !companySize) return;
    setSubmitting(true);

    try {
      const user = auth.currentUser;
      if (user && name.trim() && user.displayName !== name.trim()) {
        await updateProfile(user, { displayName: name.trim() });
      }
      if (user) {
        // Refresh the session cookie so the server picks up the
        // display name we just set — the dashboard greeting reads it
        // straight from the session on the next request.
        const idToken = await user.getIdToken(true);
        await createSessionCookie(idToken);
      }

      const result = await completeOnboarding({ role, companySize, theme });
      if ("error" in result) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const wide = step >= 2;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-8 animate-fade-up">
        <BrandMark size={40} />
      </div>

      <div
        key={step}
        className={`w-full animate-pop-in rounded-2xl border border-white/10 bg-surface/70 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[max-width] duration-300 ${
          wide ? "max-w-2xl" : "max-w-sm"
        }`}
      >
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}

        {step === 0 && (
          <StyleStep value={theme} onChange={setTheme} />
        )}
        {step === 1 && <NameStep value={name} onChange={setName} onSubmit={goNext} />}
        {step === 2 && <RoleStep value={role} onChange={setRole} />}
        {step === 3 && (
          <CompanySizeStep value={companySize} onChange={setCompanySize} />
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!canAdvance || submitting}
          className="btn-aurora mt-8 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white transition-[background-position,opacity] duration-500 hover:animate-shimmer disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Setting things up..." : isLastStep ? "Finish" : "Next"}
        </button>
      </div>

      <div className="mt-8 flex items-center gap-1.5">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-white" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function StyleStep({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (t: Theme) => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-center">Pick your style</h1>
      <p className="mt-1 text-center text-sm text-muted">
        You can always change this later.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <StyleCard
          label="Light"
          icon={Sun}
          active={value === "light"}
          onClick={() => onChange("light")}
          preview="bg-white"
          previewLines="bg-slate-200"
        />
        <StyleCard
          label="Dark"
          icon={Moon}
          active={value === "dark"}
          onClick={() => onChange("dark")}
          preview="bg-[#0b0d10]"
          previewLines="bg-white/15"
        />
      </div>
    </div>
  );
}

function StyleCard({
  label,
  icon: Icon,
  active,
  onClick,
  preview,
  previewLines,
}: {
  label: string;
  icon: typeof Sun;
  active: boolean;
  onClick: () => void;
  preview: string;
  previewLines: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-aurora-violet bg-aurora-violet/10"
          : "border-border hover:border-white/25"
      }`}
    >
      <div className={`h-20 w-full rounded-lg border border-white/10 p-2 ${preview}`}>
        <div className="space-y-1.5">
          <div className={`h-1.5 w-3/4 rounded-full ${previewLines}`} />
          <div className={`h-1.5 w-1/2 rounded-full ${previewLines}`} />
          <div className={`h-1.5 w-2/3 rounded-full ${previewLines}`} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
    </button>
  );
}

function NameStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-center">What&apos;s your name?</h1>
      <p className="mt-1 text-center text-sm text-muted">
        So we know what to call you.
      </p>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm text-muted">Full name</label>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
          placeholder="Ada Lovelace"
          className="w-full rounded-lg border border-border bg-background/80 px-3.5 py-2.5 outline-none transition-colors focus:border-primary"
        />
      </div>
    </div>
  );
}

function RoleStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-center">
        Which role fits you best?
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const active = value === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r.id)}
              className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-colors ${
                active
                  ? "border-aurora-violet bg-aurora-violet/10"
                  : "border-border hover:border-white/25"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompanySizeStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-center">
        How many people work at your company?
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COMPANY_SIZES.map((c) => {
          const Icon = c.icon;
          const active = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-colors ${
                active
                  ? "border-aurora-violet bg-aurora-violet/10"
                  : "border-border hover:border-white/25"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
