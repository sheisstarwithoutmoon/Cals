const {
  normalizeMealItem,
  buildMealEstimate,
  computeWeeklySummary,
} = require("./nutrition-helpers");

/**
 * Fallback nutrition estimation when offline or without API key.
 */
function fallbackNutritionEstimate(queryOrName = "Food item") {
  const q = (queryOrName || "").toLowerCase();

  let calories = 350;
  let protein = 18;
  let carbs = 40;
  let fat = 12;
  let mealType = "LUNCH";
  const foodName = queryOrName || "Mixed Meal";

  if (q.includes("egg") || q.includes("oat") || q.includes("pancake") || q.includes("toast") || q.includes("breakfast")) {
    mealType = "BREAKFAST";
    calories = 380;
    protein = 20;
    carbs = 35;
    fat = 14;
  } else if (q.includes("salad") || q.includes("sandwich") || q.includes("lunch") || q.includes("wrap") || q.includes("rice")) {
    mealType = "LUNCH";
    calories = 480;
    protein = 28;
    carbs = 52;
    fat = 16;
  } else if (q.includes("steak") || q.includes("chicken") || q.includes("dinner") || q.includes("curry") || q.includes("salmon") || q.includes("pasta")) {
    mealType = "DINNER";
    calories = 620;
    protein = 42;
    carbs = 48;
    fat = 22;
  } else if (q.includes("apple") || q.includes("snack") || q.includes("nuts") || q.includes("yogurt") || q.includes("protein bar") || q.includes("shake")) {
    mealType = "SNACK";
    calories = 210;
    protein = 15;
    carbs = 22;
    fat = 6;
  }

  return {
    foodName,
    mealType,
    quantity: 1,
    quantityUnit: "serving",
    calories,
    protein,
    carbs,
    fat,
    fiber: 5,
    sugar: 4,
    sodium: 320,
    micronutrients: {
      "Vitamin A (mcg)": 120,
      "Vitamin C (mg)": 15,
      "Calcium (mg)": 80,
      "Iron (mg)": 3.2,
      "Potassium (mg)": 420,
    },
    confidence: 0.88,
  };
}

/**
 * Offline estimate (no API key / AI failure): splits the description into
 * items on commas, "and", "with" and "+", and gives each a rough keyword-based
 * estimate so the form still gets a per-item breakdown to correct.
 */
function fallbackMealEstimate(description) {
  const names = description
    .split(/,|\+|\band\b|\bwith\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);

  const overall = fallbackNutritionEstimate(description);
  const items = (names.length ? names : [description.trim()])
    .map((name) => {
      const estimate = fallbackNutritionEstimate(name);
      return normalizeMealItem({ ...estimate, name });
    })
    .filter(Boolean);

  return buildMealEstimate({
    description,
    mealType: overall.mealType,
    items,
    confidence: 0.5,
  });
}

/**
 * Minimal safe fallback handling used when Gemini is unavailable (missing API
 * key, or the primary conversational tool-calling turn throws).
 *
 * Rather than duplicating the tool-calling pipeline with fragile regexes or
 * making secondary un-grounded LLM calls, it safely provides progress status
 * grounded in the pre-fetched user context.
 */
async function runFallbackChat({
  lower,
  todayCalories,
  todayProtein,
  todayCarbs,
  todayFat,
  dailyCalorieGoal,
  remainingCalories,
  weekMealsResult,
}) {
  const isSummaryQuery =
    lower.includes("summary") ||
    lower.includes("weekly report") ||
    lower.includes("week report") ||
    lower.includes("how did i do");

  if (isSummaryQuery) {
    const summary = computeWeeklySummary(weekMealsResult?.meals || []);

    return {
      action: "WEEKLY_SUMMARY",
      summary,
      reply: `Here is your 7-day nutrition summary: You logged ${summary.totalMealsLogged} meals totaling ${summary.totalWeekCalories} kcal (average ~${summary.avgDailyCalories} kcal/day). Total protein reached ${summary.totalProtein}g.`,
    };
  }

  const isGoalQuery =
    lower.includes("goal") ||
    lower.includes("how much left") ||
    lower.includes("calories left") ||
    lower.includes("remaining") ||
    lower.includes("progress");

  if (isGoalQuery) {
    return {
      action: "GOAL_CHECK",
      reply: `Your daily target is ${dailyCalorieGoal} kcal. Today you have logged ${todayCalories} kcal (${todayProtein}g protein, ${todayCarbs}g carbs, ${todayFat}g fat), leaving ${remainingCalories} kcal remaining for today.`,
    };
  }

  return {
    action: "CHAT",
    reply: `AI assistant service is currently operating in offline mode. Today you have consumed ${todayCalories} kcal (${todayProtein}g protein, ${todayCarbs}g carbs, ${todayFat}g fat) with ${remainingCalories} kcal remaining toward your target of ${dailyCalorieGoal} kcal.`,
  };
}

module.exports = {
  fallbackNutritionEstimate,
  fallbackMealEstimate,
  runFallbackChat,
};

