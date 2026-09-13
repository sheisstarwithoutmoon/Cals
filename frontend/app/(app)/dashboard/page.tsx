"use client";

import { useMemo, useState } from "react";
import { CameraIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardReports } from "@/components/dashboard/dashboard-reports";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { NutritionSummary } from "@/components/dashboard/nutrition-summary";
import { TodayMealsCard } from "@/components/dashboard/today-meals-card";
import { AiImageModal } from "@/components/meals/ai-image-modal";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import type { ExtractedNutrition } from "@/lib/api/ai";
import { sumMeals, todayRange } from "@/lib/nutrition";

export default function DashboardPage() {
  const { user } = useAuth();
  const { startDate, endDate } = useMemo(() => todayRange(), []);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<ExtractedNutrition | null>(null);

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
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsScanOpen(true)}
              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <CameraIcon className="size-4" />
              <span>Scan food</span>
            </Button>
            <MealFormDialog
              trigger={
                <Button variant="outline" className="rounded-full">
                  <PlusIcon className="size-4" />
                  <span>Log meal</span>
                </Button>
              }
              open={isLogFormOpen}
              onOpenChange={(open) => {
                setIsLogFormOpen(open);
                if (!open) setPrefillData(null);
              }}
              prefillData={prefillData}
              onSaved={refetchMeals}
            />
          </div>
        }
      />

      <AiImageModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onMealSaved={refetchMeals}
        onPrefillManualForm={(data) => {
          setPrefillData(data);
          setIsLogFormOpen(true);
        }}
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
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        !goalError &&
        !mealsError && (
          <>
            <NutritionSummary totals={totals} goal={goal} />
            <TodayMealsCard
              meals={meals}
              onUpdated={refetchMeals}
              onDeleted={refetchMeals}
            />
            <DashboardReports goal={goal} />
          </>
        )
      )}
    </div>
  );
}
