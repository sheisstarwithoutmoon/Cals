"use client";

import { useMemo } from "react";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalProgressPreview } from "@/components/goals/goal-progress-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import { sumMeals, todayRange } from "@/lib/nutrition";

export default function GoalsPage() {
  const { startDate, endDate } = useMemo(() => todayRange(), []);
  const { goal, isLoading, error, refetch, save } = useGoal();
  const { meals } = useMeals({ startDate, endDate, limit: 100 });
  const totals = useMemo(() => sumMeals(meals), [meals]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Set your daily targets and see how you're tracking."
      />

      {error && <ErrorState message={error} onRetry={refetch} />}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : (
        !error && (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <GoalForm goal={goal} onSave={save} />
            <GoalProgressPreview goal={goal} totals={totals} />
          </div>
        )
      )}
    </div>
  );
}
