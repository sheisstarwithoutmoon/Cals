import type { Metadata } from "next";

import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Set up your account | Cals",
};

export default function OnboardingPage() {
  return (
    <OnboardingGuard>
      <OnboardingWizard />
    </OnboardingGuard>
  );
}
