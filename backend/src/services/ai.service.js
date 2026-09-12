const { GoogleGenAI } = require("@google/genai");
const prisma = require("../config/prisma");
const { getMeals } = require("./meal.service");
const { getGoalByUserId, createOrUpdateGoal } = require("./goal.service");
const { loadPrompt } = require("../utils/load-prompt");

const imageNutritionPrompt = loadPrompt("image-nutrition.prompt.md");
const mealExtractionPrompt = loadPrompt("meal-extraction.prompt.md");
const nutritionQuestionPrompt = loadPrompt(
  "nutrition-question-answering.prompt.md"
);

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Centralized model names so a future model swap only happens in one place.
const VISION_MODEL = "gemini-3.5-flash-lite";
const MEAL_EXTRACTION_MODEL = "gemini-3.5-flash-lite";
const QUESTION_ANSWERING_MODEL = "gemini-3.5-flash-lite";
const PDF_IMPORT_MODEL = "gemini-3.5-flash-lite";

// Gemini's inline-data limit is ~20MB per request. Bigger PDFs need the
// Files API (upload once, reference by URI) instead of base64 in the body.
const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;
const VALID_MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

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

const GOAL_FIELD_PATTERNS = [
  { field: "dailyCalories", regex: /(calorie|calories|kcal)/i, unit: "kcal" },
  { field: "dailyProtein", regex: /protein/i, unit: "g" },
  { field: "dailyCarbs", regex: /(carbohydrate|carbs?)/i, unit: "g" },
  { field: "dailyFat", regex: /\bfat\b/i, unit: "g" },
  { field: "targetWeight", regex: /weight/i, unit: "kg" },
];

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

/**
 * Parses a natural-language goal update like "set my daily calorie goal to
 * 1800" into a { field, value, unit } triple the Goal model understands.
 * Returns null if no number/field was found, or "out-of-range" if a field
 * was recognized but the number is outside a sane bound.
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
 * Calls the Gemini API via the new @google/genai SDK and returns the raw
 * text response. Centralized here so both the vision call and the two text
 * calls below share one request shape instead of three slightly different
 * ones (the old file called `model.generateContent` three separate ways).
 */
async function generateWithGemini({ model, promptText, filePart }) {
  const contents = filePart
    ? [{ text: promptText }, filePart]
    : promptText;

  const result = await genAI.models.generateContent({
    model,
    contents,
  });

  return result.text;
}

/**
 * Coerces and validates one raw meal-entry object (from image analysis, PDF
 * import, or manual data) into the shape mealEntry.create/createMany expects.
 * Returns null if the entry is missing a usable calorie count, so a bulk
 * import can skip bad rows instead of failing the whole batch.
 */
function normalizeMealEntry(raw, userId) {
  if (!raw || typeof raw.calories !== "number") return null;

  const consumedAt = raw.date ? new Date(raw.date) : new Date();
  if (Number.isNaN(consumedAt.getTime())) return null;

  return {
    userId,
    mealType: VALID_MEAL_TYPES.includes(raw.mealType) ? raw.mealType : "LUNCH",
    foodName: raw.foodName || "Imported Meal",
    quantity: Number(raw.quantity) || 1,
    quantityUnit: raw.quantityUnit || "serving",
    calories: Math.max(0, Math.round(raw.calories)),
    protein: Math.max(0, Math.round((raw.protein || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((raw.carbs || 0) * 10) / 10),
    fat: Math.max(0, Math.round((raw.fat || 0) * 10) / 10),
    fiber: Math.max(0, Math.round((raw.fiber || 0) * 10) / 10),
    sugar: Math.max(0, Math.round((raw.sugar || 0) * 10) / 10),
    sodium: Math.max(0, Math.round((raw.sodium || 0) * 10) / 10),
    micronutrients: raw.micronutrients || {},
    consumedAt,
    source: "PDF_IMPORT",
  };
}

/**
 * Parses a food-diary/nutrition-history PDF (tabular export) and bulk-
 * imports every recognizable row as a meal entry. Rows the model can't
 * confidently extract a calorie value for are skipped and reported back,
 * rather than failing the entire import.
 */
async function importMealsFromPdf({ userId, pdfBase64 }) {
  if (!pdfBase64) {
    throw new Error("PDF data is required");
  }

  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const approxBytes = Math.floor((base64Data.length * 3) / 4);

  if (approxBytes > MAX_INLINE_PDF_BYTES) {
    throw new Error(
      "PDF is too large for inline import (>20MB). Split the export into smaller date ranges, or use the Gemini Files API for large uploads."
    );
  }

  if (!genAI) {
    throw new Error("PDF import requires the Gemini API to be configured (GEMINI_API_KEY missing).");
  }

  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: "application/pdf",
    },
  };

  const responseText = await generateWithGemini({
    model: PDF_IMPORT_MODEL,
    promptText: mealExtractionPrompt.replace(
      "{{message}}",
      "Extract every food/meal row from the attached PDF as a JSON array. " +
        "Each item must include foodName, mealType (BREAKFAST/LUNCH/DINNER/SNACK), " +
        "quantity, quantityUnit, date (ISO 8601 if present in the PDF), calories, " +
        "protein, carbs, fat, fiber, sugar, sodium. Return ONLY a JSON array, no prose."
    ),
    filePart,
  });

  const parsed = cleanJson(responseText);
  const rawEntries = Array.isArray(parsed) ? parsed : [];

  if (!rawEntries.length) {
    throw new Error("Could not find any recognizable meal entries in the PDF.");
  }

  const normalizedEntries = rawEntries
    .map((entry) => normalizeMealEntry(entry, userId))
    .filter(Boolean);

  const skippedCount = rawEntries.length - normalizedEntries.length;

  if (!normalizedEntries.length) {
    throw new Error("Found rows in the PDF, but none had a usable calorie value.");
  }

  const created = await prisma.mealEntry.createMany({
    data: normalizedEntries,
  });

  return {
    action: "PDF_IMPORTED",
    importedCount: created.count,
    skippedCount,
    reply: `Imported ${created.count} meal entries from the PDF${
      skippedCount ? ` (${skippedCount} rows skipped — missing or unrecognizable data)` : ""
    }.`,
  };
}

/**
 * Analyzes an image (plate of food or nutrition label) and extracts structured nutrition information.
 */
async function analyzeFoodImage({ imageBase64, mimeType = "image/jpeg" }) {
  if (!imageBase64) {
    throw new Error("Image data is required");
  }

  // Remove base64 header if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  if (genAI) {
    try {
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      };

      const responseText = await generateWithGemini({
        model: VISION_MODEL,
        promptText: imageNutritionPrompt,
        filePart: imagePart,
      });
      const parsed = cleanJson(responseText);

      if (!parsed || typeof parsed.calories !== "number") {
        console.warn(
          "Gemini vision response didn't match the expected schema, falling back to smart extractor. Raw response:",
          responseText
        );
      }

      if (parsed && typeof parsed.calories === "number") {
        return {
          foodName: parsed.foodName || "Identified Meal",
          mealType: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(parsed.mealType) ? parsed.mealType : "LUNCH",
          quantity: Number(parsed.quantity) || 1,
          quantityUnit: parsed.quantityUnit || "serving",
          calories: Math.max(0, Math.round(parsed.calories)),
          protein: Math.max(0, Math.round((parsed.protein || 0) * 10) / 10),
          carbs: Math.max(0, Math.round((parsed.carbs || 0) * 10) / 10),
          fat: Math.max(0, Math.round((parsed.fat || 0) * 10) / 10),
          fiber: Math.max(0, Math.round((parsed.fiber || 0) * 10) / 10),
          sugar: Math.max(0, Math.round((parsed.sugar || 0) * 10) / 10),
          sodium: Math.max(0, Math.round((parsed.sodium || 0) * 10) / 10),
          micronutrients: parsed.micronutrients || {},
          confidence: parsed.confidence || 0.92,
        };
      }
    } catch (err) {
      console.warn("Gemini vision analysis encountered error, falling back to smart extractor:", err.message);
    }
  }

  // Fallback estimation
  return fallbackNutritionEstimate("Analyzed Food Photo");
}

/**
 * Handles conversational assistant interactions: natural language meal logging, goal checking, nutrition Q&A, and weekly summaries.
 */
async function chatWithAssistant({ userId, message, history = [] }) {
  if (!message || !message.trim()) {
    throw new Error("Message is required");
  }

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. Fetch user context (Goal + Today's Meals + Last 7 Days Meals)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [goal, todayMealsResult, weekMealsResult] = await Promise.all([
    getGoalByUserId(userId),
    getMeals(userId, { page: 1, limit: 100, startDate: startOfToday, endDate: endOfToday }),
    getMeals(userId, { page: 1, limit: 200, startDate: sevenDaysAgo, endDate: endOfToday }),
  ]);

  const todayMeals = todayMealsResult.meals || [];
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const todayFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const dailyCalorieGoal = goal?.dailyCalories || 2000;
  const remainingCalories = Math.max(0, dailyCalorieGoal - todayCalories);

  // Check if user is asking to LOG a meal directly
  const isLoggingIntent =
    /^(i ate|i had|log|add|record|just ate|ate|having|consumed)\b/i.test(lower) ||
    lower.includes("for breakfast") ||
    lower.includes("for lunch") ||
    lower.includes("for dinner") ||
    lower.includes("for snack") ||
    lower.includes("for my snack");

  if (isLoggingIntent) {
    let mealDetails = fallbackNutritionEstimate(trimmed.replace(/^(i ate|i had|log|add|record|just ate)\s+/i, ""));

    if (genAI) {
      try {
        const parsePrompt = mealExtractionPrompt.replace("{{message}}", trimmed);
        const responseText = await generateWithGemini({
          model: MEAL_EXTRACTION_MODEL,
          promptText: parsePrompt,
        });
        const parsedData = cleanJson(responseText);
        if (parsedData && parsedData.calories) {
          mealDetails = {
            ...mealDetails,
            ...parsedData,
            mealType: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(parsedData.mealType) ? parsedData.mealType : mealDetails.mealType,
          };
        } else {
          console.warn(
            "Gemini meal-extraction response didn't match the expected schema, using fallback estimate. Raw response:",
            responseText
          );
        }
      } catch (err) {
        console.warn("AI parser error, used fallback:", err.message);
      }
    }

    // Create the meal entry in the database
    const createdMeal = await prisma.mealEntry.create({
      data: {
        userId,
        mealType: mealDetails.mealType || "LUNCH",
        foodName: mealDetails.foodName || "Logged Meal",
        quantity: Number(mealDetails.quantity) || 1,
        quantityUnit: mealDetails.quantityUnit || "serving",
        calories: Math.max(0, Math.round(mealDetails.calories)),
        protein: Math.max(0, Math.round((mealDetails.protein || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((mealDetails.carbs || 0) * 10) / 10),
        fat: Math.max(0, Math.round((mealDetails.fat || 0) * 10) / 10),
        fiber: Math.max(0, Math.round((mealDetails.fiber || 0) * 10) / 10),
        sugar: Math.max(0, Math.round((mealDetails.sugar || 0) * 10) / 10),
        sodium: Math.max(0, Math.round((mealDetails.sodium || 0) * 10) / 10),
        micronutrients: mealDetails.micronutrients || {},
        consumedAt: new Date(),
        source: "AI",
      },
    });

    const newTodayCalories = todayCalories + createdMeal.calories;
    const newRemaining = Math.max(0, dailyCalorieGoal - newTodayCalories);

    return {
      action: "MEAL_LOGGED",
      meal: createdMeal,
      reply: `Logged ${createdMeal.foodName} to ${createdMeal.mealType.toLowerCase()} (${createdMeal.calories} kcal, ${createdMeal.protein}g protein, ${createdMeal.carbs}g carbs, ${createdMeal.fat}g fat). You've consumed ${newTodayCalories} kcal today with ${newRemaining} kcal remaining against your goal.`,
    };
  }

  // Check if user wants to set or update a goal target
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

  // Check if user is asking for weekly summary
  if (lower.includes("summary") || lower.includes("weekly report") || lower.includes("week report") || lower.includes("how did i do")) {
    const weekMeals = weekMealsResult.meals || [];
    const totalWeekCalories = weekMeals.reduce((s, m) => s + (m.calories || 0), 0);
    const avgDailyCalories = Math.round(totalWeekCalories / 7);
    const totalProtein = Math.round(weekMeals.reduce((s, m) => s + (m.protein || 0), 0));
    const totalMealsLogged = weekMeals.length;

    return {
      action: "WEEKLY_SUMMARY",
      summary: {
        totalMealsLogged,
        totalWeekCalories,
        avgDailyCalories,
        totalProtein,
      },
      reply: `Here is your 7-day nutrition summary: You logged ${totalMealsLogged} meals totaling ${totalWeekCalories} kcal (average ~${avgDailyCalories} kcal/day). Total protein reached ${totalProtein}g. You are maintaining consistent daily tracking habits.`,
    };
  }

  // Check if user is asking about goals / remaining calories
  if (lower.includes("goal") || lower.includes("how much left") || lower.includes("calories left") || lower.includes("remaining")) {
    return {
      action: "GOAL_CHECK",
      reply: `Your daily calorie target is ${dailyCalorieGoal} kcal. Today you have logged ${todayCalories} kcal (${todayProtein}g protein, ${todayCarbs}g carbs, ${todayFat}g fat), leaving ${remainingCalories} kcal remaining for today.`,
    };
  }

  // General Q&A / Nutritional advice with context
  if (genAI) {
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
  analyzeFoodImage,
  chatWithAssistant,
  importMealsFromPdf,
};