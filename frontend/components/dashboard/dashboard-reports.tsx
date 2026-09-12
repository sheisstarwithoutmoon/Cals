"use client";

import { useMemo, useState } from "react";
import { InfoIcon } from "lucide-react";

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
  dateRangeForLastDays,
  sumMeals,
  sumMicronutrients,
} from "@/lib/nutrition";
import type { Goal } from "@/lib/types/api";

interface DashboardReportsProps {
  goal: Goal | null;
}

export function DashboardReports({ goal }: DashboardReportsProps) {
  const [range, setRange] = useState<ReportRange>(7);
  const { startDate, endDate } = useMemo(
    () => dateRangeForLastDays(range),
    [range]
  );

  const { meals, isLoading } = useMeals({ startDate, endDate, limit: 100 });

  const dailyTotals = useMemo(
    () => buildDailyTotals(meals, range),
    [meals, range]
  );
  const rangeTotals = useMemo(() => sumMeals(meals), [meals]);
  const micronutrientTotals = useMemo(() => sumMicronutrients(meals), [meals]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-stone-900">
          Reports
        </h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (
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
