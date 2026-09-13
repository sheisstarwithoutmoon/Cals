"use client";

import { useMemo } from "react";

import { CalorieTrendChart } from "@/components/reports/calorie-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeals } from "@/hooks/use-meals";
import { buildDailyTotals, dateRangeForLastDays } from "@/lib/nutrition";
import type { Goal } from "@/lib/types/api";

export function WeeklyTrendCard({ goal }: { goal: Goal | null }) {
  const { startDate, endDate } = useMemo(() => dateRangeForLastDays(7), []);
  const { meals, isLoading } = useMeals({ startDate, endDate, limit: 100 });
  const dailyTotals = useMemo(() => buildDailyTotals(meals, 7), [meals]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <CalorieTrendChart data={dailyTotals} goalCalories={goal?.dailyCalories} />
  );
}
