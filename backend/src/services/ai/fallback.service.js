const { createMeal } = require("../meal.service");
const { createOrUpdateGoal } = require("../goal.service");
const { loadPrompt } = require("../../utils/load-prompt");
const {
  isGeminiConfigured,
  generateWithGemini,
  MEAL_EXTRACTION_MODEL,
  QUESTION_ANSWERING_MODEL,
} = require("./gemini.client");
const {
  GOAL_FIELD_LABELS,
  GOAL_FIELD_MAX,
  normalizeMealItem,
  buildMealEstimate,
  parseMealExtraction,
  cleanJson,
  computeWeeklySummary,
} = require("./nutrition-helpers");

const mealExtractionPrompt = loadPrompt("meal-extraction.prompt.md");
// Only used by the fallback chat path below — the main conversational turn
// uses assistant-conversation.prompt.md instead.
const nutritionQuestionPrompt = loadPrompt(
  "nutrition-question-answering.prompt.md"
);

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

const GOAL_FIELD_PATTERNS = [
  { field: "dailyCalories", regex: /(calorie|calories|kcal)/i, unit: "kcal" },
  { field: "dailyProtein", regex: /protein/i, unit: "g" },
  { field: "dailyCarbs", regex: /(carbohydrate|carbs?)/i, unit: "g" },
  { field: "dailyFat", regex: /\bfat\b/i, unit: "g" },
  { field: "targetWeight", regex: /weight/i, unit: "kg" },
];

/**
 * Parses a natural-language goal update like "set my daily calorie goal to
 * 1800" into a { field, value, unit } triple the Goal model understands.
 * Returns null if no number/field was found, or "out-of-range" if a field
 * was recognized but the number is outside a sane bound. Used only by the
 * regex-based fallback chat path (no Gemini available).
 */
function parseGoalUpdate(message) {
  const numberMatch = message.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return null;

  const value = parseFloat(numberMatch[1]);
  const match = GOAL_FIELD_PATTERNS.find(({ regex }) => regex.test(message));

  if (!match) return null;
  if (value <= 0 || value > GOAL_FIELD_MAX[match.field]) return "out-of-range";

  return { field: match.field, value, unit: match.unit };
}

/**
 * Regex/keyword-based chat handling used only when Gemini is unavailable
 * (missing API key, or the tool-calling turn throws). It has no memory of
 * earlier turns — it's a degraded offline mode, not the primary
 * conversational path.
 */
async function runFallbackChat({
  trimmed,
  lower,
  userId,
  todayCalories,
  todayProtein,
  todayCarbs,
  todayFat,
  dailyCalorieGoal,
  remainingCalories,
  weekMealsResult,
}) {
  const isLoggingIntent =
    /^(i ate|i had|log|add|record|just ate|ate|having|consumed)\b/i.test(lower) ||
    lower.includes("for breakfast") ||
    lower.includes("for lunch") ||
    lower.includes("for dinner") ||
    lower.includes("for snack") ||
    lower.includes("for my snack");

  if (isLoggingIntent) {
    const description = trimmed.replace(/^(i ate|i had|log|add|record|just ate)\s+/i, "");
    let mealDetails = fallbackMealEstimate(description);

    if (isGeminiConfigured) {
      try {
        const parsePrompt = mealExtractionPrompt.replace("{{message}}", trimmed);
        const responseText = await generateWithGemini({
          model: MEAL_EXTRACTION_MODEL,
          promptText: parsePrompt,
          json: true,
        });
        mealDetails = parseMealExtraction(cleanJson(responseText), description) || mealDetails;
      } catch (err) {
        console.warn("AI parser error, used fallback:", err.message);
      }
    }

    const createdMeal = await createMeal(userId, {
      mealType: mealDetails.mealType,
      foodName: mealDetails.foodName,
      items: mealDetails.items,
      consumedAt: new Date(),
      source: "AI",
    });

    const newTodayCalories = todayCalories + createdMeal.calories;
    const newRemaining = Math.max(0, dailyCalorieGoal - newTodayCalories);

    return {
      action: "MEAL_LOGGED",
      meal: createdMeal,
      reply: `Logged ${createdMeal.foodName} to ${createdMeal.mealType.toLowerCase()} (${createdMeal.calories} kcal, ${createdMeal.protein}g protein, ${createdMeal.carbs}g carbs, ${createdMeal.fat}g fat). You've consumed ${newTodayCalories} kcal today with ${newRemaining} kcal remaining against your goal.`,
    };
  }

  const isGoalUpdateIntent =
    /^(set|update|change)\b/i.test(lower) && /(goal|target)/i.test(lower);

  if (isGoalUpdateIntent) {
    const parsed = parseGoalUpdate(trimmed);

    if (parsed === "out-of-range") {
      return {
        action: "CHAT",
        reply: "That number looks out of range for a daily target. Please try a more typical value.",
      };
    }

    if (!parsed) {
      return {
        action: "CHAT",
        reply:
          'Tell me which target to update and the new number, e.g. "set my daily calorie goal to 1800" or "update my protein target to 150g".',
      };
    }

    const updatedGoal = await createOrUpdateGoal(userId, {
      [parsed.field]: parsed.value,
    });

    return {
      action: "GOAL_UPDATED",
      goal: updatedGoal,
      reply: `Updated your ${GOAL_FIELD_LABELS[parsed.field]} target to ${parsed.value}${parsed.unit}.`,
    };
  }

  if (lower.includes("summary") || lower.includes("weekly report") || lower.includes("week report") || lower.includes("how did i do")) {
    const summary = computeWeeklySummary(weekMealsResult.meals || []);

    return {
      action: "WEEKLY_SUMMARY",
      summary,
      reply: `Here is your 7-day nutrition summary: You logged ${summary.totalMealsLogged} meals totaling ${summary.totalWeekCalories} kcal (average ~${summary.avgDailyCalories} kcal/day). Total protein reached ${summary.totalProtein}g. You are maintaining consistent daily tracking habits.`,
    };
  }

  if (lower.includes("goal") || lower.includes("how much left") || lower.includes("calories left") || lower.includes("remaining")) {
    return {
      action: "GOAL_CHECK",
      reply: `Your daily calorie target is ${dailyCalorieGoal} kcal. Today you have logged ${todayCalories} kcal (${todayProtein}g protein, ${todayCarbs}g carbs, ${todayFat}g fat), leaving ${remainingCalories} kcal remaining for today.`,
    };
  }

  if (isGeminiConfigured) {
    try {
      const prompt = nutritionQuestionPrompt
        .replace("{{dailyCalorieGoal}}", String(dailyCalorieGoal))
        .replace("{{todayCalories}}", String(todayCalories))
        .replace("{{todayProtein}}", String(todayProtein))
        .replace("{{todayCarbs}}", String(todayCarbs))
        .replace("{{todayFat}}", String(todayFat))
        .replace("{{remainingCalories}}", String(remainingCalories))
        .replace("{{message}}", trimmed);

      const responseText = await generateWithGemini({
        model: QUESTION_ANSWERING_MODEL,
        promptText: prompt,
      });

      return {
        action: "CHAT",
        reply: responseText.trim(),
      };
    } catch (err) {
      console.warn("Gemini Q&A error:", err.message);
    }
  }

  return {
    action: "CHAT",
    reply: `To stay within your daily target of ${dailyCalorieGoal} kcal, focus on balanced whole foods with lean proteins, complex carbohydrates, and high fiber. You have ${remainingCalories} kcal remaining for today.`,
  };
}

module.exports = {
  fallbackNutritionEstimate,
  fallbackMealEstimate,
  runFallbackChat,
};
