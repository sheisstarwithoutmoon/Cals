"use client";

import { useMemo, useState } from "react";
import { PlusIcon, UploadCloudIcon, UtensilsCrossedIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import {
  MealFilters,
  type MealFiltersState,
} from "@/components/meals/meal-filters";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { MealListItem } from "@/components/meals/meal-list-item";
import { MealPagination } from "@/components/meals/meal-pagination";
import { ImportMealModal } from "@/components/meals/import-meal-modal";
import { useMeals } from "@/hooks/use-meals";
import { formatDate } from "@/lib/format";
import type { MealListFilters, MealType } from "@/lib/types/api";

const DEFAULT_FILTERS: MealFiltersState = {
  mealType: "ALL",
  startDate: "",
  endDate: "",
};

export default function MealsPage() {
  const [filters, setFilters] = useState<MealFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const apiFilters: MealListFilters = useMemo(
    () => ({
      page,
      limit: 10,
      mealType: filters.mealType === "ALL" ? undefined : (filters.mealType as MealType),
      startDate: filters.startDate ? `${filters.startDate}T00:00:00.000` : undefined,
      endDate: filters.endDate ? `${filters.endDate}T23:59:59.999` : undefined,
    }),
    [page, filters]
  );

  const { meals, pagination, isLoading, error, refetch } = useMeals(apiFilters);

  function handleFiltersChange(next: MealFiltersState) {
    setFilters(next);
    setPage(1);
  }

  const groups = useMemo(() => {
    const map = new Map<string, typeof meals>();
    for (const meal of meals) {
      const key = formatDate(meal.consumedAt);
      map.set(key, [...(map.get(key) ?? []), meal]);
    }
    return Array.from(map.entries());
  }, [meals]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meals"
        description="Log and review everything you've eaten."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="rounded-full border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <UploadCloudIcon className="size-4" />
              <span>Import meal</span>
            </Button>
            <MealFormDialog
              trigger={
                <Button className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white">
                  <PlusIcon className="size-4" />
                  <span>Log meal</span>
                </Button>
              }
              onSaved={refetch}
            />
          </div>
        }
      />

      <ImportMealModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={refetch}
      />

      <MealFilters value={filters} onChange={handleFiltersChange} />

      {error && <ErrorState message={error} onRetry={refetch} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !error && meals.length === 0 && (
        <EmptyState
          icon={UtensilsCrossedIcon}
          title="No meals found"
          description="Try adjusting your filters, or log your first meal to see it here."
          action={
            <MealFormDialog
              trigger={<Button variant="outline">Log a meal</Button>}
              onSaved={refetch}
            />
          }
        />
      )}

      {!isLoading && !error && meals.length > 0 && (
        <div className="space-y-6">
          {groups.map(([date, dayMeals]) => (
            <div key={date} className="space-y-2.5">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {date}
              </h3>
              <div className="space-y-2.5">
                {dayMeals.map((meal) => (
                  <MealListItem
                    key={meal.id}
                    meal={meal}
                    onUpdated={refetch}
                    onDeleted={refetch}
                  />
                ))}
              </div>
            </div>
          ))}

          <MealPagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
