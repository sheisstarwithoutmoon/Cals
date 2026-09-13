"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3Icon, InfoIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { CalorieTrendChart } from "@/components/reports/calorie-trend-chart";
import { GoalVsActualChart } from "@/components/reports/goal-vs-actual-chart";
import { MacroBreakdownChart } from "@/components/reports/macro-breakdown-chart";
import { MacroTrendChart } from "@/components/reports/macro-trend-chart";
import { MicronutrientChart } from "@/components/reports/micronutrient-chart";
import { OtherNutrientsChart } from "@/components/reports/other-nutrients-chart";
import { RangeTabs, type ReportRange } from "@/components/reports/range-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeals } from "@/hooks/use-meals";
import {
  buildDailyTotals,
  sumMeals,
  sumMicronutrients,
} from "@/lib/nutrition";
import type { Goal, MealEntry } from "@/lib/types/api";

interface DashboardReportsProps {
  goal: Goal | null;
  refreshKey?: number | string;
}

export function DashboardReports({ goal, refreshKey }: DashboardReportsProps) {
  const [range, setRange] = useState<ReportRange>(7);
  const [hasAutoSelectedRange, setHasAutoSelectedRange] = useState(false);

  // Fetch recent meals (up to 100) once without restrictive date filters.
  // This loads much faster and enables instant, zero-latency switching between 7d, 14d, 30d.
  const { meals: allMeals, isLoading, refetch } = useMeals({ limit: 100 });

  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Helper to filter meals within N days from today
  const filterMealsForDays = (mealsList: MealEntry[], days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    return mealsList.filter((m) => new Date(m.consumedAt) >= cutoff);
  };

  // Smart range detection: If user has no meals in the last 7 days, but has meals in 14d
  // (e.g. entries on 5th Sept) or 30d, automatically select the range that has data!
  useEffect(() => {
    if (hasAutoSelectedRange || isLoading || allMeals.length === 0) return;

    const in7d = filterMealsForDays(allMeals, 7);
    const in14d = filterMealsForDays(allMeals, 14);
    const in30d = filterMealsForDays(allMeals, 30);

    if (in7d.length === 0) {
      if (in14d.length > 0) {
        setRange(14);
      } else if (in30d.length > 0) {
        setRange(30);
      }
    }
    setHasAutoSelectedRange(true);
  }, [allMeals, isLoading, hasAutoSelectedRange]);

  // Active meals filtered by currently selected range
  const activeMeals = useMemo(
    () => filterMealsForDays(allMeals, range),
    [allMeals, range]
  );

  const dailyTotals = useMemo(
    () => buildDailyTotals(activeMeals, range),
    [activeMeals, range]
  );

  const rangeTotals = useMemo(() => sumMeals(activeMeals), [activeMeals]);
  const micronutrientTotals = useMemo(
    () => sumMicronutrients(activeMeals),
    [activeMeals]
  );

  const hasData = activeMeals.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Nutrition reports
        </h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <EmptyState
              icon={BarChart3Icon}
              title={`No report data for last ${range} days`}
              description={
                allMeals.length > 0
                  ? `You have meals logged outside this ${range}-day window. Select 14d or 30d above to view older entries.`
                  : "Log meals over a few days to see your calorie trends, macro splits, and micronutrient breakdowns here."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <CalorieTrendChart
              data={dailyTotals}
              goalCalories={goal?.dailyCalories}
            />
            <GoalVsActualChart
              data={dailyTotals}
              goalCalories={goal?.dailyCalories}
            />
            <MacroTrendChart data={dailyTotals} />
            <MacroBreakdownChart totals={rangeTotals} />
            <MicronutrientChart micronutrients={micronutrientTotals} />
            <OtherNutrientsChart totals={rangeTotals} />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>
              These charts are calculated live from your logged meals over
              the selected period (up to the 100 most recent).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
