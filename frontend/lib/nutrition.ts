import type { MealEntry } from "@/lib/types/api";

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export function sumMeals(meals: MealEntry[]): NutritionTotals {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + (meal.protein ?? 0),
      carbs: totals.carbs + (meal.carbs ?? 0),
      fat: totals.fat + (meal.fat ?? 0),
      fiber: totals.fiber + (meal.fiber ?? 0),
      sugar: totals.sugar + (meal.sugar ?? 0),
      sodium: totals.sodium + (meal.sodium ?? 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }
  );
}

export function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export function percentOf(value: number, target: number | null | undefined) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

/**
 * Formats a Date as a local (not UTC) calendar-day key. `toISOString()`
 * converts through UTC first, which shifts the date backward a day for any
 * timezone ahead of UTC (e.g. IST) — that mismatch silently drops meals
 * into the wrong day bucket when grouping by this key.
 */
export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sumMicronutrients(meals: MealEntry[]): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const meal of meals) {
    if (!meal.micronutrients) continue;

    for (const [key, value] of Object.entries(meal.micronutrients)) {
      totals[key] = (totals[key] ?? 0) + (value ?? 0);
    }
  }

  return totals;
}
