"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  SproutIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MEAL_TYPE_META, type MealTypeFilter } from "@/components/meals/meal-type-meta";
import { formatNumber } from "@/lib/format";
import type { Goal, MealSummary } from "@/lib/types/api";

interface RangeNutritionSummaryProps {
  summary: MealSummary | null;
  goal: Goal | null;
  mealType: MealTypeFilter;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const RING_SIZE = 128;
const RING_STROKE = 10;

function AverageRing({ calories, target }: { calories: number; target: number | null }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  // Without a target the ring is drawn full, purely as a frame for the number.
  const pct = target && target > 0 ? Math.min(1, calories / target) : calories > 0 ? 1 : 0;
  const isOver = Boolean(target && calories > target);

  return (
    <div className="relative size-32 shrink-0">
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke={isOver ? "var(--destructive)" : "var(--primary)"}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {formatNumber(calories)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">kcal / day</span>
      </div>
    </div>
  );
}

const MACROS = [
  { key: "protein", label: "Protein", dotClassName: "bg-chart-2" },
  { key: "carbs", label: "Carbs", dotClassName: "bg-chart-3" },
  { key: "fat", label: "Fat", dotClassName: "bg-chart-4" },
] as const;

interface StatusMessage {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "good" | "alert" | "neutral";
  action?: { label: string; href: string };
}

function buildStatus(
  summary: MealSummary,
  goal: Goal | null,
  mealType: MealTypeFilter
): StatusMessage {
  if (mealType !== "ALL") {
    return {
      icon: BarChart3Icon,
      title: `${MEAL_TYPE_META[mealType].label} only`,
      description: "Averages include only this meal type. Choose All meals to compare with your daily goal.",
      tone: "neutral",
    };
  }

  const target = goal?.dailyCalories;

  if (!target) {
    return {
      icon: SproutIcon,
      title: "No daily calorie goal set",
      description: "Set a goal to see how your averages compare.",
      tone: "neutral",
      action: { label: "Set goals", href: "/goals" },
    };
  }

  const average = summary.averages.calories;
  const difference = Math.round(average - target);

  // Within 10% of the goal counts as on track.
  if (Math.abs(difference) <= target * 0.1) {
    return {
      icon: SproutIcon,
      title: "On track with your goal",
      description: `Averaging ${formatNumber(average)} of ${formatNumber(target)} kcal a day.`,
      tone: "good",
    };
  }

  if (difference > 0) {
    return {
      icon: TrendingUpIcon,
      title: "Above your calorie goal",
      description: `${formatNumber(difference)} kcal over your ${formatNumber(target)} kcal goal on average.`,
      tone: "alert",
    };
  }

  return {
    icon: TrendingDownIcon,
    title: "Below your calorie goal",
    description: `${formatNumber(-difference)} kcal under your ${formatNumber(target)} kcal goal on average.`,
    tone: "neutral",
  };
}

const STATUS_TONE_STYLES: Record<StatusMessage["tone"], { panel: string; icon: string }> = {
  good: { panel: "bg-[#E7F0EA]", icon: "bg-white text-primary" },
  neutral: { panel: "bg-muted/60", icon: "bg-white text-primary" },
  alert: { panel: "bg-[#C1402E]/8", icon: "bg-white text-[#C1402E]" },
};

export function RangeNutritionSummary({
  summary,
  goal,
  mealType,
  isLoading,
  error,
  onRetry,
}: RangeNutritionSummaryProps) {
  const hasData = Boolean(summary && summary.mealCount > 0);
  const status = summary && hasData ? buildStatus(summary, goal, mealType) : null;
  const toneStyles = status ? STATUS_TONE_STYLES[status.tone] : null;
  const StatusIcon = status?.icon;

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-5 px-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Nutrition summary</h2>
          <p className="text-xs text-muted-foreground">
            {hasData && summary
              ? `Daily average across ${summary.loggedDays} logged ${summary.loggedDays === 1 ? "day" : "days"}`
              : "Daily average for selected range"}
          </p>
        </div>

        {isLoading && !summary ? (
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Skeleton className="size-32 rounded-full" />
            <div className="min-w-32 flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="space-y-2 rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-foreground">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !hasData || !summary ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 px-4 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary">
              <BarChart3Icon className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">No meals in this range</p>
            <p className="text-xs text-muted-foreground">
              Log a meal or pick a different range to see averages.
            </p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-wrap items-center justify-center gap-x-6 gap-y-4 transition-opacity",
                isLoading && "opacity-60"
              )}
            >
              <AverageRing
                calories={summary.averages.calories}
                target={goal?.dailyCalories ?? null}
              />

              <ul className="min-w-36 flex-1 space-y-3">
                {MACROS.map((macro) => (
                  <li key={macro.key} className="flex items-center gap-2.5 text-sm">
                    <span className={cn("size-2.5 shrink-0 rounded-full", macro.dotClassName)} />
                    <span className="flex-1 text-muted-foreground">{macro.label}</span>
                    <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
                      {formatNumber(summary.averages[macro.key])}g
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {status && toneStyles && StatusIcon && (
              <div className={cn("flex items-start gap-3 rounded-xl p-3.5", toneStyles.panel)}>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full shadow-2xs",
                    toneStyles.icon
                  )}
                >
                  <StatusIcon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{status.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {status.description}
                  </p>
                  {status.action && (
                    <Link
                      href={status.action.href}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {status.action.label}
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
