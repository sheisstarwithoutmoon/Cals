"use client";

import { useMemo, useState } from "react";
import {
  CameraIcon,
  FileTextIcon,
  PlusIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AiImageModal } from "@/components/meals/ai-image-modal";
import {
  DateRangePicker,
  parseDateKey,
  thisMonthRange,
  toDateKey,
  type DateRangeValue,
} from "@/components/meals/date-range-picker";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { MealListItem } from "@/components/meals/meal-list-item";
import { MealPagination } from "@/components/meals/meal-pagination";
import { MealTypeTabs } from "@/components/meals/meal-type-tabs";
import type { MealTypeFilter } from "@/components/meals/meal-type-meta";
import { PdfImportModal } from "@/components/meals/pdf-import-modal";
import { RangeNutritionSummary } from "@/components/meals/range-nutrition-summary";
import { useGoal } from "@/hooks/use-goal";
import { useMealSummary } from "@/hooks/use-meal-summary";
import { useMeals } from "@/hooks/use-meals";
import type { ExtractedNutrition } from "@/lib/api/ai";
import { formatDate, formatNumber } from "@/lib/format";
import { MAX_PAGES, MEAL_TYPE_SORT_ORDER } from "@/lib/constants";
import type { MealEntry, MealSummaryFilters } from "@/lib/types/api";

const PAGE_SIZE = 10;

function dayHeading(dateKey: string) {
  return formatDate(parseDateKey(dateKey));
}

/** A new meal logged from a past day's "Add item" defaults to noon that day. */
function defaultTimeForDay(dateKey: string) {
  if (dateKey === toDateKey(new Date())) return new Date();
  const date = parseDateKey(dateKey);
  date.setHours(12, 0, 0, 0);
  return date;
}

export default function MealsPage() {
  const [mealType, setMealType] = useState<MealTypeFilter>("ALL");
  const [dateRange, setDateRange] = useState<DateRangeValue>(thisMonthRange);
  const [page, setPage] = useState(1);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<ExtractedNutrition | null>(null);
  const [logForDay, setLogForDay] = useState<Date | undefined>(undefined);

  const summaryFilters: MealSummaryFilters = useMemo(
    () => ({
      mealType: mealType === "ALL" ? undefined : mealType,
      startDate: dateRange.startDate
        ? parseDateKey(dateRange.startDate).toISOString()
        : undefined,
      endDate: dateRange.endDate
        ? new Date(`${dateRange.endDate}T23:59:59.999`).toISOString()
        : undefined,
    }),
    [mealType, dateRange]
  );

  const listFilters = useMemo(
    () => ({ ...summaryFilters, page, limit: PAGE_SIZE }),
    [summaryFilters, page]
  );

  const { meals, pagination, isLoading, error, refetch: refetchMeals } =
    useMeals(listFilters);
  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useMealSummary(summaryFilters);
  const { goal } = useGoal();

  function refetchAll() {
    refetchMeals();
    refetchSummary();
  }

  function handleMealTypeChange(next: MealTypeFilter) {
    setMealType(next);
    setPage(1);
  }

  function handleDateRangeChange(next: DateRangeValue) {
    setDateRange(next);
    setPage(1);
  }

  function handlePageChange(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), MAX_PAGES));
  }

  function openLogForm(day?: Date) {
    setPrefillData(null);
    setLogForDay(day);
    setIsLogFormOpen(true);
  }

  const groups = useMemo(() => {
    const map = new Map<string, MealEntry[]>();
    for (const meal of meals) {
      const key = toDateKey(new Date(meal.consumedAt));
      map.set(key, [...(map.get(key) ?? []), meal]);
    }
    // Sort each day's meals: Dinner → Snack → Lunch → Breakfast
    for (const [, dayMeals] of map) {
      dayMeals.sort(
        (a, b) =>
          (MEAL_TYPE_SORT_ORDER[a.mealType] ?? 9) -
          (MEAL_TYPE_SORT_ORDER[b.mealType] ?? 9)
      );
    }
    return Array.from(map.entries());
  }, [meals]);

  // Day totals come from the summary so they cover every entry that day,
  // not only the ones on the current page.
  const dayCalories = useMemo(
    () => new Map(summary?.days.map((day) => [day.date, day.calories]) ?? []),
    [summary]
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Meals
          </h1>
          <p className="text-sm text-muted-foreground">
            Log and review everything you've eaten.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          <Button className="rounded-full" onClick={() => openLogForm()}>
            <PlusIcon className="size-4" />
            <span>Log meal</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsScanOpen(true)}
            className="rounded-full"
          >
            <CameraIcon className="size-4" />
            <span>Scan food</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPdfImportOpen(true)}
            className="rounded-full"
          >
            <FileTextIcon className="size-4" />
            <span>Import PDF</span>
          </Button>
        </div>
      </div>

      <MealFormDialog
        open={isLogFormOpen}
        onOpenChange={(open) => {
          setIsLogFormOpen(open);
          if (!open) {
            setPrefillData(null);
            setLogForDay(undefined);
          }
        }}
        prefillData={prefillData}
        defaultConsumedAt={logForDay}
        onSaved={refetchAll}
      />

      <AiImageModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onMealSaved={refetchAll}
        onPrefillManualForm={(data) => {
          setLogForDay(undefined);
          setPrefillData(data);
          setIsLogFormOpen(true);
        }}
      />

      <PdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        onImportComplete={refetchAll}
      />

      <MealTypeTabs
        value={mealType}
        onChange={handleMealTypeChange}
        counts={summary?.mealTypeCounts ?? null}
        isLoading={isSummaryLoading}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-0">
          <RangeNutritionSummary
            summary={summary}
            goal={goal}
            mealType={mealType}
            isLoading={isSummaryLoading}
            error={summaryError}
            onRetry={refetchSummary}
          />
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card/60 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-4">
          {error && <ErrorState message={error} onRetry={refetchMeals} />}

          {isLoading && !error && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && !error && meals.length === 0 && (
            <EmptyState
              icon={UtensilsCrossedIcon}
              title="No meals found"
              description={
                mealType !== "ALL"
                  ? "No meals of this type in the selected range."
                  : "Nothing logged in the selected range. Log a meal or pick a different range."
              }
              action={
                <Button className="rounded-full" onClick={() => openLogForm()}>
                  <PlusIcon className="size-4" />
                  <span>Log meal</span>
                </Button>
              }
            />
          )}

          {!isLoading && !error && meals.length > 0 && (
            <div className="space-y-6">
              {groups.map(([dateKey, dayMeals]) => (
                <section key={dateKey} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {dayHeading(dateKey)}
                    </h3>
                    <div className="flex items-center gap-3">
                      {dayCalories.has(dateKey) && (
                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                          {formatNumber(dayCalories.get(dateKey))} kcal
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-card"
                        onClick={() => openLogForm(defaultTimeForDay(dateKey))}
                      >
                        <PlusIcon />
                        Add item
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dayMeals.map((meal) => (
                      <MealListItem
                        key={meal.id}
                        meal={meal}
                        onUpdated={refetchAll}
                        onDeleted={refetchAll}
                      />
                    ))}
                  </div>
                </section>
              ))}

              <MealPagination pagination={pagination} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
