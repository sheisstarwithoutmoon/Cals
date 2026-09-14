const { Prisma } = require("../../generated/prisma/client");
const { buildMealData } = require("../meal.service");

const VALID_MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

const GOAL_FIELD_LABELS = {
  dailyCalories: "daily calorie",
  dailyProtein: "daily protein",
  dailyCarbs: "daily carb",
  dailyFat: "daily fat",
  targetWeight: "target weight",
};

const GOAL_FIELD_MAX = {
  dailyCalories: 10000,
  dailyProtein: 1000,
  dailyCarbs: 1500,
  dailyFat: 500,
  targetWeight: 500,
};

const ITEM_NUTRIENT_KEYS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];

/**
 * Coerces a raw nutrition object (LLM output, image analysis, or a manual
 * value) into the rounded, non-negative numeric shape every meal-creation
 * path needs. Centralized so a future rounding/clamping rule change happens
 * once instead of being retyped at each call site.
 */
function normalizeNutritionValues(raw) {
  return {
    calories: Math.max(0, Math.round(raw.calories)),
    protein: Math.max(0, Math.round((raw.protein || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((raw.carbs || 0) * 10) / 10),
    fat: Math.max(0, Math.round((raw.fat || 0) * 10) / 10),
    fiber: Math.max(0, Math.round((raw.fiber || 0) * 10) / 10),
    sugar: Math.max(0, Math.round((raw.sugar || 0) * 10) / 10),
    sodium: Math.max(0, Math.round((raw.sodium || 0) * 10) / 10),
  };
}

/** Keeps only finite, non-negative micronutrient numbers from LLM output. */
function normalizeMicronutrients(raw) {
  if (!raw || typeof raw !== "object") return {};

  return Object.fromEntries(
    Object.entries(raw)
      .map(([name, value]) => [name, Number(value)])
      .filter(([, value]) => Number.isFinite(value) && value >= 0)
  );
}

/**
 * Coerces one raw food item (LLM output or a PDF row) into the shape a
 * MealItem is saved with. Returns null when it has no usable name or calorie
 * value, so the caller can skip it.
 */
function normalizeMealItem(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name ?? raw.foodName ?? "").trim().slice(0, 120);
  const calories = Number(raw.calories);

  if (!name || !Number.isFinite(calories)) return null;

  const quantity = Number(raw.quantity);

  return {
    name,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    quantityUnit: String(raw.quantityUnit || "serving").slice(0, 50),
    ...normalizeNutritionValues({ ...raw, calories }),
    micronutrients: normalizeMicronutrients(raw.micronutrients),
  };
}

/**
 * Builds the meal-level result the meal form consumes from a list of
 * normalized items: meal totals are summed from the items by the same
 * `buildMealData` the meal service saves with, so the estimate the user sees
 * matches what gets stored.
 */
function buildMealEstimate({ description, mealType, items, confidence }) {
  const { mealData } = buildMealData({ foodName: description, items });

  return {
    foodName: mealData.foodName,
    mealType: VALID_MEAL_TYPES.includes(mealType) ? mealType : "LUNCH",
    quantity: mealData.quantity ?? undefined,
    quantityUnit: mealData.quantityUnit ?? undefined,
    calories: mealData.calories,
    protein: mealData.protein,
    carbs: mealData.carbs,
    fat: mealData.fat,
    fiber: mealData.fiber,
    sugar: mealData.sugar,
    sodium: mealData.sodium,
    micronutrients: mealData.micronutrients === Prisma.DbNull ? {} : mealData.micronutrients,
    items,
    confidence,
  };
}

/**
 * Parses meal-extraction LLM output into a meal estimate with items. Accepts
 * the item-list shape the prompt asks for, and the older single-object shape
 * (one combined food) as a one-item meal. Returns null if nothing usable.
 */
function parseMealExtraction(parsed, description) {
  if (!parsed || typeof parsed !== "object") return null;

  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : typeof parsed.calories === "number"
      ? [{ ...parsed, name: parsed.foodName || description }]
      : [];

  const items = rawItems.map(normalizeMealItem).filter(Boolean);
  if (!items.length) return null;

  return buildMealEstimate({
    description,
    mealType: parsed.mealType,
    items,
    confidence: parsed.confidence || 0.85,
  });
}

/**
 * Parses JSON safely from LLM text responses that might contain markdown fences.
 */
function cleanJson(text) {
  try {
    const raw = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function roundToDigits(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Rescales items so each nutrient in `targets` sums exactly to its target,
 * keeping each item's relative share. Used when the meal's totals are
 * already known (a PDF row's values, or a meal being edited) and the AI is
 * only asked to split it into parts: its per-item estimates set the split,
 * while the known totals stay authoritative. Nutrients missing from
 * `targets` are left as estimated.
 */
function scaleItemsToTotals(items, targets) {
  if (!items.length || !targets) return items;

  const scaled = items.map((item) => ({ ...item }));
  const calorieSum = items.reduce((sum, item) => sum + (item.calories || 0), 0);

  for (const key of ITEM_NUTRIENT_KEYS) {
    const target = targets[key];
    if (typeof target !== "number" || !Number.isFinite(target) || target < 0) continue;

    const digits = key === "calories" ? 0 : 1;
    const sum = items.reduce((total, item) => total + (item[key] || 0), 0);
    // Split by this nutrient's own estimate; if the AI gave it 0 everywhere,
    // fall back to each item's calorie share, then to an even split.
    const shares = items.map((item) =>
      sum > 0
        ? (item[key] || 0) / sum
        : calorieSum > 0
          ? (item.calories || 0) / calorieSum
          : 1 / items.length
    );

    let assigned = 0;
    scaled.forEach((item, index) => {
      item[key] = roundToDigits(target * shares[index], digits);
      assigned += item[key];
    });

    // Put the rounding remainder on the largest item so the parts add up exactly.
    const largest = shares.indexOf(Math.max(...shares));
    scaled[largest][key] = Math.max(
      0,
      roundToDigits(scaled[largest][key] + (target - assigned), digits)
    );
  }

  return scaled;
}

/**
 * Summarizes a window of meals for the "weekly summary" feature. Averages
 * over the number of distinct calendar days actually present in the data
 * (capped at 7) rather than a flat /7 — a user who only has 2 days of
 * history shouldn't have their average diluted by 5 days of zeros.
 */
function computeWeeklySummary(weekMeals) {
  const totalWeekCalories = weekMeals.reduce(
    (s, m) => s + (m.calories || 0),
    0
  );

  const totalProtein = Math.round(
    weekMeals.reduce((s, m) => s + (m.protein || 0), 0) * 10
  ) / 10;

  const totalMealsLogged = weekMeals.length;

  const distinctDays = new Set(
    weekMeals.map((m) => new Date(m.consumedAt).toDateString())
  ).size;

  const daysToAverageOver = Math.min(Math.max(distinctDays, 1), 7);

  const avgDailyCalories = Math.round(
    totalWeekCalories / daysToAverageOver
  );

  const avgDailyProtein =
    Math.round((totalProtein / daysToAverageOver) * 10) / 10;

  return {
    totalMealsLogged,
    totalWeekCalories,
    avgDailyCalories,
    totalProtein,
    avgDailyProtein,
  };
}

module.exports = {
  VALID_MEAL_TYPES,
  GOAL_FIELD_LABELS,
  GOAL_FIELD_MAX,
  ITEM_NUTRIENT_KEYS,
  normalizeNutritionValues,
  normalizeMealItem,
  buildMealEstimate,
  parseMealExtraction,
  cleanJson,
  scaleItemsToTotals,
  computeWeeklySummary,
};
