import { MEAL_TYPE_LABELS, NUTRIENT_DAILY_VALUES } from "@/lib/constants";
import type { Goal, MealReport, MealType } from "@/lib/types/api";

/**
 * Turns a `MealReport` plus the user's goal into the data each report chart
 * renders. Every comparison against a goal or reference value lives here,
 * so the charts are purely presentational and no two charts recompute (or
 * repeat) the same numbers.
 */

export interface DailyPoint {
  date: string;
  label: string;
  /** 0 for days in the range with nothing logged. */
  mealCount?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTarget {
  key: "protein" | "carbs" | "fat";
  label: string;
  /** Average grams per logged day. */
  average: number;
  target: number | null;
}

export interface EnergySource {
  key: "protein" | "carbs" | "fat";
  label: string;
  /** Average kcal per logged day from this macro. */
  calories: number;
  percent: number;
}

export interface MealTypeCalories {
  mealType: MealType;
  label: string;
  /** Average kcal per logged day from this meal type. */
  averageCalories: number;
  percent: number;
}

export interface NutrientCoverage {
  label: string;
  unit: string;
  average: number;
  dailyValue: number;
  percent: number;
  /** "aim" nutrients should reach 100%; "limit" nutrients should stay under it. */
  kind: "aim" | "limit";
}

export interface ReportView {
  hasData: boolean;
  goalCalories: number | null;
  daily: DailyPoint[];
  macroTargets: MacroTarget[];
  energySources: EnergySource[];
  mealTypes: MealTypeCalories[];
  nutrients: NutrientCoverage[];
}

const MACROS = [
  { key: "protein", label: "Protein", goalKey: "dailyProtein", kcalPerGram: 4 },
  { key: "carbs", label: "Carbs", goalKey: "dailyCarbs", kcalPerGram: 4 },
  { key: "fat", label: "Fat", goalKey: "dailyFat", kcalPerGram: 9 },
] as const;

const NUTRIENTS: {
  key: string;
  dailyValueKey: string;
  label: string;
  unit: string;
  kind: NutrientCoverage["kind"];
}[] = [
  { key: "fiber", dailyValueKey: "Fiber (g)", label: "Fiber", unit: "g", kind: "aim" },
  { key: "Vitamin A (mcg)", dailyValueKey: "Vitamin A (mcg)", label: "Vitamin A", unit: "mcg", kind: "aim" },
  { key: "Vitamin C (mg)", dailyValueKey: "Vitamin C (mg)", label: "Vitamin C", unit: "mg", kind: "aim" },
  { key: "Calcium (mg)", dailyValueKey: "Calcium (mg)", label: "Calcium", unit: "mg", kind: "aim" },
  { key: "Iron (mg)", dailyValueKey: "Iron (mg)", label: "Iron", unit: "mg", kind: "aim" },
  { key: "Potassium (mg)", dailyValueKey: "Potassium (mg)", label: "Potassium", unit: "mg", kind: "aim" },
  { key: "sugar", dailyValueKey: "Sugar (g)", label: "Sugar", unit: "g", kind: "limit" },
  { key: "sodium", dailyValueKey: "Sodium (mg)", label: "Sodium", unit: "mg", kind: "limit" },
];

function percentOf(value: number, reference: number) {
  return reference > 0 ? Math.round((value / reference) * 100) : 0;
}

export function buildReportView(report: MealReport, goal: Goal | null): ReportView {
  const daily = report.days.map((day) => ({
    date: day.date,
    label: new Date(`${day.date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    mealCount: day.mealCount,
    calories: Math.round(day.calories),
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat,
  }));

  const macroTargets = MACROS.map(({ key, label, goalKey }) => ({
    key,
    label,
    average: report.averages[key],
    target: goal?.[goalKey] ?? null,
  }));

  const macroCalories = MACROS.map(({ key, kcalPerGram }) => report.averages[key] * kcalPerGram);
  const macroCaloriesTotal = macroCalories.reduce((sum, value) => sum + value, 0);

  const energySources = MACROS.map(({ key, label }, index) => ({
    key,
    label,
    calories: Math.round(macroCalories[index]),
    percent: percentOf(macroCalories[index], macroCaloriesTotal),
  }));

  const mealTypeTotal = report.mealTypes.reduce((sum, row) => sum + row.calories, 0);
  const mealTypes = report.mealTypes
    .filter((row) => row.mealCount > 0)
    .map((row) => ({
      mealType: row.mealType,
      label: MEAL_TYPE_LABELS[row.mealType],
      averageCalories: report.loggedDays > 0 ? Math.round(row.calories / report.loggedDays) : 0,
      percent: percentOf(row.calories, mealTypeTotal),
    }));

  const nutrients = NUTRIENTS.map((nutrient) => {
    const average =
      nutrient.key === "fiber" || nutrient.key === "sugar" || nutrient.key === "sodium"
        ? report.averages[nutrient.key]
        : report.micronutrientAverages[nutrient.key] ?? 0;
    const dailyValue = NUTRIENT_DAILY_VALUES[nutrient.dailyValueKey];

    return {
      label: nutrient.label,
      unit: nutrient.unit,
      average,
      dailyValue,
      percent: percentOf(average, dailyValue),
      kind: nutrient.kind,
    };
  });

  return {
    hasData: report.mealCount > 0,
    goalCalories: goal?.dailyCalories ?? null,
    daily,
    macroTargets,
    energySources,
    mealTypes,
    nutrients,
  };
}
