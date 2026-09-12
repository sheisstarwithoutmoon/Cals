"use client";

import { useMemo } from "react";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { NutritionSummary } from "@/components/dashboard/nutrition-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TodayMealsCard } from "@/components/dashboard/today-meals-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import { sumMeals, todayRange } from "@/lib/nutrition";

export default function DashboardPage() {
  const { user } = useAuth();
  const { startDate, endDate } = useMemo(() => todayRange(), []);

  const {
    goal,
    isLoading: isGoalLoading,
    error: goalError,
    refetch: refetchGoal,
  } = useGoal();

  const {
    meals,
    isLoading: isMealsLoading,
    error: mealsError,
    refetch: refetchMeals,
  } = useMeals({ startDate, endDate, limit: 100 });

  const totals = useMemo(() => sumMeals(meals), [meals]);
  const isLoading = isGoalLoading || isMealsLoading;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Dashboard"}
        description="Here's how today is going so far."
      />

      {(goalError || mealsError) && (
        <ErrorState
          message={goalError ?? mealsError ?? "Failed to load dashboard data."}
          onRetry={() => {
            refetchGoal();
            refetchMeals();
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        !goalError &&
        !mealsError && (
          <>
            <NutritionSummary totals={totals} goal={goal} />
            <QuickActions onMealSaved={refetchMeals} />
            <TodayMealsCard
              meals={meals}
              onUpdated={refetchMeals}
              onDeleted={refetchMeals}
            />
          </>
        )
      )}
    </div>
  );
}
