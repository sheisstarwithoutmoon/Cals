"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3Icon, InfoIcon } from "lucide-react";
import { cn } from "cn";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { CalorieTrendChart } from "@/components/reports/calorie-trend-chart";
import { GoalVsActualChart } from "@/components/reports/goal-vs-actual-chart";
import { MacroBreakdownChart } from "@/components/reports/macro-breakdown-chart";
import { MacroTrendChart } from "@/components/reports/macro-trend-chart";
import { MealTypeChart } from "@/components/reports/meal-type-chart";
import { MicronutrientChart } from "@/components/reports/micronutrient-chart";
import {
  RangeTabs,
  type CustomDateRange,
  type ReportRange,
} from "@/components/reports/range-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useMealReport } from "@/hooks/use-meal-report";
import { toLocalDateKey } from "@/lib/nutrition";
import { buildReportView } from "@/lib/reports";
import type { Goal } from "@/lib/types/api";

interface DashboardReportsProps {
  goal: Goal | null;
  refreshKey?: number | string;
}

function lastDaysRange(days: number): CustomDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { startDate: toLocalDateKey(start), endDate: toLocalDateKey(now) };
}

function formatCustomRange(range: CustomDateRange) {
  const format = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${format(range.startDate)} – ${format(range.endDate)}`;
}

export function DashboardReports({ goal, refreshKey }: DashboardReportsProps) {
  const [range, setRange] = useState<ReportRange>(7);
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => lastDaysRange(7));

  const activeRange = range === "custom" ? customRange : lastDaysRange(range);

  // Local calendar-day bounds, sent as instants so the server reports on the
  // same days the user sees.
  const { report, isStale, isLoading, error, refetch } = useMealReport({
    startDate: new Date(`${activeRange.startDate}T00:00:00`).toISOString(),
    endDate: new Date(`${activeRange.endDate}T23:59:59.999`).toISOString(),
  });

  useEffect(() => {
    if (refreshKey !== undefined) refetch();
  }, [refreshKey, refetch]);

  const view = useMemo(() => (report ? buildReportView(report, goal) : null), [report, goal]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            Nutrition reports
          </h2>
          {range === "custom" && (
            <p className="text-xs text-muted-foreground">{formatCustomRange(customRange)}</p>
          )}
        </div>
        <RangeTabs
          value={range}
          onChange={setRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {error && (!view || isStale) ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !view || (isStale && !view.hasData) ? (
        // Nothing to show for the requested range yet: a previous range's
        // empty result would otherwise flash "No report data" under the new label.
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !view.hasData ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <EmptyState
              icon={BarChart3Icon}
              title={
                range === "custom"
                  ? "No report data for selected date range"
                  : `No report data for last ${range} days`
              }
              description={
                range === "custom"
                  ? "Log meals within this custom date range or select a different range to see your trends."
                  : "Log meals in this period, or select 14d, 30d or Custom above to see your calorie trends, macro splits and nutrient coverage."
              }
            />
          </CardContent>
        </Card>
      ) : (
        // On refetch the previous charts stay visible, dimmed, instead of
        // flashing back to a skeleton.
        <div className={cn("space-y-4 transition-opacity", isLoading && "opacity-60")}>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <CalorieTrendChart data={view.daily} goalCalories={view.goalCalories} />
            <GoalVsActualChart macros={view.macroTargets} />
            <MacroTrendChart data={view.daily} />
            <MacroBreakdownChart sources={view.energySources} />
            <MicronutrientChart nutrients={view.nutrients} />
            <MealTypeChart mealTypes={view.mealTypes} />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>
              These charts are calculated from every meal you logged in the
              selected period. Averages are per day with meals logged.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
