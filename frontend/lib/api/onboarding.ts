import { apiFetch } from "@/lib/api/client";
import type {
  GoalType,
  OnboardingProfileInput,
  OnboardingStatus,
  OnboardingTargets,
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

export function saveGoalType(goalType: GoalType) {
  return apiFetch<{ success: true; goalType: GoalType }>(
    "/onboarding/goal-type",
    { method: "PUT", body: { goalType } }
  );
}

export function getSuggestedTargets() {
  return apiFetch<{ success: true; targets: OnboardingTargets }>(
    "/onboarding/suggested-targets"
  );
}

export function completeOnboarding(payload: OnboardingTargets) {
  return apiFetch<{ success: true }>("/onboarding/complete", {
    method: "POST",
    body: payload,
  });
}
