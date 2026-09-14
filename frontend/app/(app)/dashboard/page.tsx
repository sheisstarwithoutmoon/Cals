"use client";

import { useMemo, useState } from "react";
import { CameraIcon, FileTextIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { NutritionSummary } from "@/components/dashboard/nutrition-summary";
import { TodayMealsCard } from "@/components/dashboard/today-meals-card";
import { DashboardReports } from "@/components/dashboard/dashboard-reports";
import { AiImageModal } from "@/components/meals/ai-image-modal";
import { PdfImportModal } from "@/components/meals/pdf-import-modal";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import type { ExtractedNutrition } from "@/lib/api/ai";
import { sumMeals, todayRange } from "@/lib/nutrition";

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { startDate, endDate } = useMemo(() => todayRange(), []);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
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

  const [reportRefreshKey, setReportRefreshKey] = useState(0);

  function handleDataRefreshed() {
    refetchMeals();
    setReportRefreshKey((k) => k + 1);
  }

  const totals = useMemo(() => sumMeals(meals), [meals]);
  const isLoading = isGoalLoading || isMealsLoading;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          firstName ? `${timeOfDayGreeting()}, ${firstName}` : "Dashboard"
        }
        description="Here's how today is going so far."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MealFormDialog
              trigger={
                <Button className="rounded-full">
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
              onSaved={handleDataRefreshed}
            />
          </div>
        }
      />

      <AiImageModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onMealSaved={handleDataRefreshed}
        onPrefillManualForm={(data) => {
          setPrefillData(data);
          setIsLogFormOpen(true);
        }}
      />

      <PdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        onImportComplete={handleDataRefreshed}
      />

      {(goalError || mealsError) && (
        <ErrorState
          message={goalError ?? mealsError ?? "Failed to load dashboard data."}
          onRetry={() => {
            refetchGoal();
            handleDataRefreshed();
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
              onUpdated={handleDataRefreshed}
              onDeleted={handleDataRefreshed}
            />
            <DashboardReports goal={goal} refreshKey={reportRefreshKey} />
          </>
        )
      )}
    </div>
  );
}
