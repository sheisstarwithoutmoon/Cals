"use client";

import { useMemo } from "react";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { DailyTargetsCard } from "@/components/goals/daily-targets-card";
import { GoalProgressPreview } from "@/components/goals/goal-progress-preview";
import { BodyCard, HealthCard, WeightGoalCard } from "@/components/goals/profile-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import { useProfile } from "@/hooks/use-profile";
import { sumMeals, todayRange } from "@/lib/nutrition";
import type { ProfileUpdate } from "@/lib/types/api";

export default function GoalsPage() {
  const { startDate, endDate } = useMemo(() => todayRange(), []);
  const { goal, isLoading: isGoalLoading, error: goalError, refetch: refetchGoal, save } = useGoal();
  const {
    profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
    update,
  } = useProfile();
  const { meals } = useMeals({ startDate, endDate, limit: 100 });
  const totals = useMemo(() => sumMeals(meals), [meals]);

  // Profile changes can update the saved goal's target weight on the server.
  async function updateProfile(patch: ProfileUpdate) {
    const adjustments = await update(patch);
    refetchGoal();
    return adjustments;
  }

  const error = profileError ?? goalError;
  const isLoading = (isProfileLoading && !profile) || (isGoalLoading && !goal);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Your weight goal, body details, health and daily targets in one place."
      />

      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            refetchProfile();
            refetchGoal();
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        !error &&
        profile && (
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <WeightGoalCard view={profile} onUpdate={updateProfile} />
            <BodyCard view={profile} onUpdate={updateProfile} />
            <DailyTargetsCard goal={goal} suggested={profile.suggestedTargets} onSave={save} />
            <GoalProgressPreview goal={goal} totals={totals} />
            <HealthCard view={profile} onUpdate={updateProfile} />
          </div>
        )
      )}
    </div>
  );
}
