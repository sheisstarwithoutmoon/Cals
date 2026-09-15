import { apiFetch } from "@/lib/api/client";
import type {
  AllergyIntolerance,
  BodyAssessment,
  DietPreference,
  GoalPlanInput,
  GoalType,
  HealthCondition,
  OnboardingProfileInput,
  OnboardingStatus,
  OnboardingTargets,
  WeightPlan,
} from "@/lib/types/api";

export function getOnboardingStatus() {
  return apiFetch<{ success: true } & OnboardingStatus>("/onboarding/status");
}

export function saveProfile(payload: OnboardingProfileInput) {
  return apiFetch<{ success: true; profile: OnboardingProfileInput }>(
    "/onboarding/profile",
    { method: "PUT", body: payload }
  );
}

export function saveHealthConditions(payload: {
  healthConditions: HealthCondition[];
  dietPreference?: DietPreference | null;
  allergies?: AllergyIntolerance[];
}) {
  return apiFetch<{
    success: true;
    healthConditions: HealthCondition[];
    dietPreference: DietPreference | null;
    allergies: AllergyIntolerance[];
    assessment: BodyAssessment | null;
  }>("/onboarding/health", { method: "PUT", body: payload });
}

export function saveGoalType(payload: GoalPlanInput) {
  return apiFetch<{
    success: true;
    goalType: GoalType;
    targetWeight: number | null;
    weeklyWeightChangeKg: number | null;
  }>("/onboarding/goal-type", { method: "PUT", body: payload });
}

export function getSuggestedTargets() {
  return apiFetch<{
    success: true;
    targets: OnboardingTargets;
    plan: WeightPlan | null;
    maintenanceCalories: number;
    profile?: {
      heightCm?: number | null;
      currentWeight?: number | null;
      targetWeight?: number | null;
      goalType?: GoalType | null;
      bmi?: number | null;
    };
  }>("/onboarding/suggested-targets");
}

export function completeOnboarding(payload: OnboardingTargets) {
  return apiFetch<{ success: true }>("/onboarding/complete", {
    method: "POST",
    body: payload,
  });
}
