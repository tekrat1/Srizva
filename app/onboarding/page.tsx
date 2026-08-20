import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect=/onboarding");

  return <OnboardingWizard initialName={user.name ?? ""} />;
}
