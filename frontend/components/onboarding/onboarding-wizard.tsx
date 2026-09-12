"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { BrandLogo } from "@/components/common/brand-logo";
import { ErrorState } from "@/components/common/error-state";
import { StepBasicInfo } from "@/components/onboarding/step-basic-info";
import { StepGoal } from "@/components/onboarding/step-goal";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { StepTargets } from "@/components/onboarding/step-targets";
import { useAuth } from "@/contexts/auth-context";
import { useOnboarding } from "@/hooks/use-onboarding";
import type { GoalType, OnboardingProfileInput } from "@/lib/types/api";

const STEP_LABELS = ["Basic info", "Goal", "Targets"];

export function OnboardingWizard() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { status, isLoading, error, refetch } = useOnboarding();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<Partial<OnboardingProfileInput>>({});
  const [goalType, setGoalType] = useState<GoalType | null>(null);

  useEffect(() => {
    if (!status) return;

    setStep((status.nextStep ?? 3) as 1 | 2 | 3);
    setGoalType(status.goalType);
    setProfile({
      name: status.profile.name,
      age: status.profile.age ?? undefined,
      heightCm: status.profile.heightCm ?? undefined,
      currentWeight: status.profile.currentWeight ?? undefined,
      activityLevel: status.profile.activityLevel ?? undefined,
    });
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef7f2]">
        <Loader2Icon className="size-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef7f2] px-4">
        <ErrorState
          message={error ?? "Something went wrong."}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-[#eef7f2] to-[#eef7f2] px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="md" brandName="Cals" href={null} />
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg sm:p-9">
          <StepIndicator current={step} labels={STEP_LABELS} />

          {step === 1 && (
            <StepBasicInfo
              initial={profile}
              onSaved={(saved) => {
                setProfile(saved);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <StepGoal
              initial={goalType}
              onBack={() => setStep(1)}
              onSaved={(saved) => {
                setGoalType(saved);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <StepTargets
              onBack={() => setStep(2)}
              onComplete={async () => {
                await refresh();
                router.replace("/dashboard");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
