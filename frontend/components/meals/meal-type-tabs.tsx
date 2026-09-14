"use client";

import { cn } from "cn";

import {
  MEAL_TYPE_FILTERS,
  MEAL_TYPE_META,
  type MealTypeFilter,
} from "@/components/meals/meal-type-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";

interface MealTypeTabsProps {
  value: MealTypeFilter;
  onChange: (value: MealTypeFilter) => void;
  counts: Record<MealTypeFilter, number> | null;
  isLoading?: boolean;
}

export function MealTypeTabs({
  value,
  onChange,
  counts,
  isLoading,
}: MealTypeTabsProps) {
  return (
    <>
      {/* Mobile View: Compact Segmented Tab Card */}
      <div
        role="tablist"
        aria-label="Filter by meal type"
        className="grid grid-cols-5 rounded-2xl border border-border bg-card p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] gap-1 md:hidden"
      >
        {MEAL_TYPE_FILTERS.map((type) => {
          const isActive = value === type;
          const shortLabel =
            type === "ALL" ? "All" : type === "SNACK" ? "Snack" : MEAL_TYPE_META[type].label;

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(type)}
              className={cn(
                "flex items-center justify-center rounded-xl py-2 px-1 text-[11px] min-[380px]:text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-foreground/75 hover:text-foreground hover:bg-muted/40"
              )}
            >
              <span>{shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop / Tablet View: Full Cards with Icons & Counts */}
      <div
        role="tablist"
        aria-label="Filter by meal type"
        className="hidden md:grid md:grid-cols-5 gap-3"
      >
        {MEAL_TYPE_FILTERS.map((type) => {
          const meta = MEAL_TYPE_META[type];
          const Icon = meta.icon;
          const isActive = value === type;
          const count = counts?.[type] ?? 0;

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(type)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "border-primary/40 bg-[#E7F0EA]"
                  : "border-border hover:border-primary/25 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  meta.iconClassName
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {meta.label}
                </span>
                {isLoading && !counts ? (
                  <Skeleton className="mt-1 h-3 w-14" />
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    {formatNumber(count)} {count === 1 ? "meal" : "meals"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
