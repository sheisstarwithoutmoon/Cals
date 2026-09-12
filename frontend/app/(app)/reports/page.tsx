"use client";

import { useMemo, useState } from "react";
import { InfoIcon } from "lucide-react";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { CalorieTrendChart } from "@/components/reports/calorie-trend-chart";
import { GoalVsActualChart } from "@/components/reports/goal-vs-actual-chart";
import { MacroBreakdownChart } from "@/components/reports/macro-breakdown-chart";
import { MicronutrientChart } from "@/components/reports/micronutrient-chart";
import { RangeTabs, type ReportRange } from "@/components/reports/range-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoal } from "@/hooks/use-goal";
import { useMeals } from "@/hooks/use-meals";
import { buildDailyTotals, dateRangeForLastDays, sumMeals } from "@/lib/nutrition";

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>(7);
  const { startDate, endDate } = useMemo(
    () => dateRangeForLastDays(range),
    [range]
  );

  const { goal, isLoading: isGoalLoading } = useGoal();
  const {
    meals,
    isLoading: isMealsLoading,
    error,
    refetch,
  } = useMeals({ startDate, endDate, limit: 100 });

  const dailyTotals = useMemo(
    () => buildDailyTotals(meals, range),
    [meals, range]
  );
  const rangeTotals = useMemo(() => sumMeals(meals), [meals]);
  const isLoading = isGoalLoading || isMealsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Visualize your nutrition trends over time."
        action={<RangeTabs value={range} onChange={setRange} />}
      />

      {error && <ErrorState message={error} onRetry={refetch} />}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        !error && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <CalorieTrendChart
                data={dailyTotals}
                goalCalories={goal?.dailyCalories}
              />
              <GoalVsActualChart
                data={dailyTotals}
                goalCalories={goal?.dailyCalories}
              />
              <MacroBreakdownChart totals={rangeTotals} />
              <MicronutrientChart totals={rangeTotals} />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              <p>
                These charts are calculated live from your logged meals over
                the selected period (up to the 100 most recent). Dedicated
                report analytics and AI-generated insights aren&apos;t
                available yet.
              </p>
            </div>
          </>
        )
      )}
    </div>
  );
}
