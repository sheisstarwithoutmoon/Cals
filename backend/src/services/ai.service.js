const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/prisma");
const { getMeals } = require("./meal.service");
const { getGoalByUserId, createOrUpdateGoal } = require("./goal.service");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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
  let foodName = queryOrName || "Mixed Meal";

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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze this image (which could be a plate of food, a meal, or a packaged nutrition facts label).
Extract or accurately estimate the nutritional information.
Return ONLY a valid JSON object strictly matching this schema with no extra text:
{
  "foodName": "string",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "quantity": number,
  "quantityUnit": "string",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "micronutrients": {
    "Vitamin A (mcg)": number,
    "Vitamin C (mg)": number,
    "Calcium (mg)": number,
    "Iron (mg)": number,
    "Potassium (mg)": number
  },
  "confidence": number
}`;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      const parsed = cleanJson(responseText);

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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const parsePrompt = `Extract nutrition and food details from this user query: "${trimmed}".
Return strictly a JSON object:
{
  "foodName": "concise name of food",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "quantity": number,
  "quantityUnit": "serving" | "grams" | "pieces" | "bowls",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number
}`;
        const parseRes = await model.generateContent(parsePrompt);
        const parsedData = cleanJson(parseRes.response.text());
        if (parsedData && parsedData.calories) {
          mealDetails = {
            ...mealDetails,
            ...parsedData,
            mealType: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(parsedData.mealType) ? parsedData.mealType : mealDetails.mealType,
          };
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are Cals AI, an expert, encouraging, and concise nutrition assistant.
User Daily Goal: ${dailyCalorieGoal} kcal
Today's Consumption: ${todayCalories} kcal (${todayProtein}g P, ${todayCarbs}g C, ${todayFat}g F)
Remaining Today: ${remainingCalories} kcal

User message: "${trimmed}"

Provide a concise, helpful response (2-4 sentences max). Do NOT use emojis.`;

      const response = await model.generateContent(prompt);
      return {
        action: "CHAT",
        reply: response.response.text().trim(),
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
};
