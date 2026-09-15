"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { BrandLogo } from "@/components/common/brand-logo";
import { ErrorState } from "@/components/common/error-state";
import { StepBasicInfo } from "@/components/onboarding/step-basic-info";
import { StepGoal } from "@/components/onboarding/step-goal";
import { StepHealth } from "@/components/onboarding/step-health";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { StepTargetWeight } from "@/components/onboarding/step-target-weight";
import { StepTargets } from "@/components/onboarding/step-targets";
import { useAuth } from "@/contexts/auth-context";
import { useOnboarding } from "@/hooks/use-onboarding";
import type {
  AllergyIntolerance,
  BodyAssessment,
  DietPreference,
  GoalType,
  HealthCondition,
  OnboardingProfileInput,
} from "@/lib/types/api";

type Step = 1 | 2 | 3 | 4;

interface GoalState {
  goalType: GoalType | null;
  targetWeight: number | null;
  weeklyWeightChangeKg: number | null;
}

const STEP_LABELS = ["Basic info", "Health", "Goal", "Targets"];

export function OnboardingWizard() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { status, isLoading, error, refetch } = useOnboarding();

  const [step, setStep] = useState<Step>(1);
  const [goalSubStep, setGoalSubStep] = useState<1 | 2>(1);
  const [activeChangeGoal, setActiveChangeGoal] = useState<"LOSE" | "GAIN">("GAIN");
  const [profile, setProfile] = useState<Partial<OnboardingProfileInput>>({});
  const [health, setHealth] = useState<{
    conditions: HealthCondition[];
    dietPreference: DietPreference | null;
    allergies: AllergyIntolerance[];
    reviewed: boolean;
  }>({
    conditions: [],
    dietPreference: null,
    allergies: [],
    reviewed: false,
  });
  const [assessment, setAssessment] = useState<BodyAssessment | null>(null);
  const [goal, setGoal] = useState<GoalState>({
    goalType: null,
    targetWeight: null,
    weeklyWeightChangeKg: null,
  });

  useEffect(() => {
    if (!status) return;

    setStep((status.nextStep ?? 4) as Step);
    setHealth({
      conditions: status.healthConditions,
      dietPreference: status.dietPreference,
      allergies: status.allergies,
      reviewed: status.healthReviewed,
    });
    setAssessment(status.assessment);
    setGoal({
      goalType: status.goalType,
      targetWeight: status.targetWeight,
      weeklyWeightChangeKg: status.weeklyWeightChangeKg,
    });
    setProfile({
      name: status.profile.name,
      age: status.profile.age ?? undefined,
      gender: status.profile.gender ?? undefined,
      heightCm: status.profile.heightCm ?? undefined,
      currentWeight: status.profile.currentWeight ?? undefined,
      activityLevel: status.profile.activityLevel ?? undefined,
    });
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorState
          message={error ?? "Something went wrong."}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
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
            <StepHealth
              initialConditions={health.conditions}
              initialDiet={health.dietPreference}
              initialAllergies={health.allergies}
              initiallyReviewed={health.reviewed}
              gender={profile.gender}
              onBack={() => setStep(1)}
              onSaved={(saved) => {
                setHealth({
                  conditions: saved.healthConditions,
                  dietPreference: saved.dietPreference,
                  allergies: saved.allergies,
                  reviewed: true,
                });
                setAssessment(saved.assessment);
                setStep(3);
              }}
            />
          )}

          {step === 3 && goalSubStep === 1 && (
            <StepGoal
              initialGoalType={goal.goalType}
              assessment={assessment}
              heightCm={profile.heightCm}
              onBack={() => setStep(2)}
              onSavedMaintain={(saved) => {
                setGoal({
                  goalType: "MAINTAIN",
                  targetWeight: null,
                  weeklyWeightChangeKg: null,
                });
                setGoalSubStep(1);
                setStep(4);
              }}
              onProceedToTargetWeight={(type) => {
                setActiveChangeGoal(type);
                setGoalSubStep(2);
              }}
            />
          )}

          {step === 3 && goalSubStep === 2 && (
            <StepTargetWeight
              goalType={activeChangeGoal}
              initialTargetWeight={goal.targetWeight}
              initialWeeklyWeightChangeKg={goal.weeklyWeightChangeKg}
              assessment={assessment}
              currentWeight={profile.currentWeight}
              onBack={() => setGoalSubStep(1)}
              onSaved={(saved) => {
                setGoal({
                  goalType: saved.goalType,
                  targetWeight: saved.targetWeight ?? null,
                  weeklyWeightChangeKg: saved.weeklyWeightChangeKg ?? null,
                });
                setGoalSubStep(1);
                setStep(4);
              }}
            />
          )}

          {step === 4 && (
            <StepTargets
              onBack={() => {
                setStep(3);
                if (goal.goalType === "LOSE" || goal.goalType === "GAIN") {
                  setActiveChangeGoal(goal.goalType);
                  setGoalSubStep(2);
                } else {
                  setGoalSubStep(1);
                }
              }}
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
