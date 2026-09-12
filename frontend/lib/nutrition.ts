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

export function dateRangeForLastDays(days: number) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));

  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export interface DailyTotal extends NutritionTotals {
  date: string;
  label: string;
}

/**
 * Formats a Date as a local (not UTC) calendar-day key. `toISOString()`
 * converts through UTC first, which shifts the date backward a day for any
 * timezone ahead of UTC (e.g. IST) — that mismatch silently dropped meals
 * from their correct day bucket below.
 */
function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDailyTotals(
  meals: MealEntry[],
  days: number
): DailyTotal[] {
  const now = new Date();
  const buckets = new Map<string, MealEntry[]>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    day.setDate(day.getDate() - i);
    buckets.set(toLocalDateKey(day), []);
  }

  for (const meal of meals) {
    const key = toLocalDateKey(new Date(meal.consumedAt));
    if (buckets.has(key)) {
      buckets.get(key)!.push(meal);
    }
  }

  return Array.from(buckets.entries()).map(([date, dayMeals]) => {
    const totals = sumMeals(dayMeals);
    const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return { date, label, ...totals };
  });
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
