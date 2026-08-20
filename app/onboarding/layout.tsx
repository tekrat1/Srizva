import AuthAura from "@/components/auth/AuthAura";

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
      <AuthAura />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
