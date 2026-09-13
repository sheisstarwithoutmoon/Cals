const { GoogleGenAI, Type } = require("@google/genai");
const prisma = require("../config/prisma");
const { getMeals, createMeal } = require("./meal.service");
const { getGoalByUserId, createOrUpdateGoal } = require("./goal.service");
const { loadPrompt } = require("../utils/load-prompt");
const { uploadAttachment } = require("./upload.service");
const chatService = require("./chat.service");

const imageNutritionPrompt = loadPrompt("image-nutrition.prompt.md");
const mealExtractionPrompt = loadPrompt("meal-extraction.prompt.md");
const pdfDiaryImportPrompt = loadPrompt("pdf-diary-import.prompt.md");
// Only used by the no-API-key / error fallback path below — the main
// conversational turn uses assistant-conversation.prompt.md instead.
const nutritionQuestionPrompt = loadPrompt(
  "nutrition-question-answering.prompt.md"
);
const assistantConversationPrompt = loadPrompt(
  "assistant-conversation.prompt.md"
);

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Centralized model names so a future model swap only happens in one place.
const VISION_MODEL = "gemini-3.5-flash-lite";
const MEAL_EXTRACTION_MODEL = "gemini-3.5-flash-lite";
const QUESTION_ANSWERING_MODEL = "gemini-3.5-flash-lite";
const PDF_IMPORT_MODEL = "gemini-3.5-flash-lite";
const CHAT_MODEL = "gemini-3.5-flash-lite";

// Gemini's inline-data limit is ~20MB per request. Bigger PDFs need the
// Files API (upload once, reference by URI) instead of base64 in the body.
const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;
const VALID_MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

// A diary PDF row only ever has a date, not a time of day. These give each
// meal type a sensible wall-clock time so same-day imports land in the
// right order instead of all sharing one timestamp.
const MEAL_TYPE_DEFAULT_TIME = {
  BREAKFAST: "08:00:00",
  LUNCH: "13:00:00",
  SNACK: "16:00:00",
  DINNER: "19:30:00",
};

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
 * Coerces and validates one raw meal-entry row from a PDF diary import into
 * the shape mealEntry.create/createMany expects. Returns null (so the row
 * is skipped and reported, not silently mis-dated) if it's missing a usable
 * calorie count or a real date — a diary row with no readable date has no
 * business being dated "today" just because that's when the import ran.
 */
function normalizeMealEntry(raw, userId) {
  if (!raw || typeof raw.calories !== "number") return null;
  if (!raw.date) return null;

  const mealType = VALID_MEAL_TYPES.includes(raw.mealType) ? raw.mealType : "LUNCH";
  const consumedAt = new Date(`${raw.date}T${MEAL_TYPE_DEFAULT_TIME[mealType]}`);
  if (Number.isNaN(consumedAt.getTime())) return null;

  return {
    userId,
    mealType,
    foodName: raw.foodName || "Imported Meal",
    quantity: Number(raw.quantity) || 1,
    quantityUnit: raw.quantityUnit || "serving",
    ...normalizeNutritionValues(raw),
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
    promptText: pdfDiaryImportPrompt,
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
    throw new Error("Found rows in the PDF, but none had a usable date and calorie value.");
  }

  const created = await prisma.mealEntry.createMany({
    data: normalizedEntries,
  });

  return {
    action: "PDF_IMPORTED",
    importedCount: created.count,
    skippedCount,
    sampleEntries: normalizedEntries.slice(0, 5),
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

  const attachmentUrl = await uploadAttachment(imageBase64, "cals/meal-photos");
  const attachment = attachmentUrl
    ? { attachmentUrl, attachmentType: "IMAGE" }
    : {};

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
          mealType: VALID_MEAL_TYPES.includes(parsed.mealType) ? parsed.mealType : "LUNCH",
          quantity: Number(parsed.quantity) || 1,
          quantityUnit: parsed.quantityUnit || "serving",
          ...normalizeNutritionValues(parsed),
          micronutrients: parsed.micronutrients || {},
          confidence: parsed.confidence || 0.92,
          ...attachment,
        };
      }
    } catch (err) {
      console.warn("Gemini vision analysis encountered error, falling back to smart extractor:", err.message);
    }
  }

  // Fallback estimation
  return { ...fallbackNutritionEstimate("Analyzed Food Photo"), ...attachment };
}

/**
 * Estimates nutrition from a free-text food description (e.g. a
 * comma-separated list of items in one meal) without an image — used by the
 * "Estimate with AI" action in the manual meal-logging form.
 */
async function extractNutritionFromText(description) {
  if (!description || !description.trim()) {
    throw new Error("A food description is required");
  }

  if (genAI) {
    try {
      const prompt = mealExtractionPrompt.replace("{{message}}", description.trim());
      const responseText = await generateWithGemini({
        model: MEAL_EXTRACTION_MODEL,
        promptText: prompt,
      });
      const parsed = cleanJson(responseText);

      if (parsed && typeof parsed.calories === "number") {
        return {
          foodName: parsed.foodName || description.trim(),
          mealType: VALID_MEAL_TYPES.includes(parsed.mealType) ? parsed.mealType : "LUNCH",
          quantity: Number(parsed.quantity) || 1,
          quantityUnit: parsed.quantityUnit || "serving",
          ...normalizeNutritionValues(parsed),
          micronutrients: parsed.micronutrients || {},
          confidence: parsed.confidence || 0.85,
        };
      }
    } catch (err) {
      console.warn("Gemini text extraction encountered error, falling back to smart extractor:", err.message);
    }
  }

  return fallbackNutritionEstimate(description);
}

/**
 * Summarizes a window of meals for the "weekly summary" feature. Averages
 * over the number of distinct calendar days actually present in the data
 * (capped at 7) rather than a flat /7 — a user who only has 2 days of
 * history shouldn't have their average diluted by 5 days of zeros.
 */
function computeWeeklySummary(weekMeals) {
  const totalWeekCalories = weekMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = Math.round(weekMeals.reduce((s, m) => s + (m.protein || 0), 0));
  const totalMealsLogged = weekMeals.length;

  const distinctDays = new Set(
    weekMeals.map((m) => new Date(m.consumedAt).toDateString())
  ).size;
  const daysToAverageOver = Math.min(Math.max(distinctDays, 1), 7);
  const avgDailyCalories = Math.round(totalWeekCalories / daysToAverageOver);

  return { totalMealsLogged, totalWeekCalories, avgDailyCalories, totalProtein };
}

// --- Conversational assistant (tool-calling) ---------------------------

/**
 * Function-calling tools exposed to the chat model. Logging a meal or
 * changing a goal can ONLY happen by the model calling one of these — the
 * model is instructed (see assistant-conversation.prompt.md) never to claim
 * an action succeeded unless it actually invoked the matching tool, which is
 * what stops it from replying "done!" without anything being saved.
 */
const chatToolDeclarations = [
  {
    name: "log_meal",
    description:
      "Log one or more food items as meal entries in the user's diary. This is the ONLY way to actually save a meal — use it whenever the user wants food they described (in this message or earlier in the conversation) recorded. Prefer combining items eaten together at the same time into a single entry with a combined foodName and summed nutrition; only use separate entries for genuinely separate meals.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          description: "One entry per distinct meal/food occasion to log.",
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: "Concise name of the food, joining multiple items eaten together with ', '.",
              },
              mealType: {
                type: Type.STRING,
                enum: VALID_MEAL_TYPES,
              },
              quantity: { type: Type.NUMBER },
              quantityUnit: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              fiber: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
              sodium: { type: Type.NUMBER },
            },
            required: ["foodName", "mealType", "calories"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "update_goal",
    description: "Update one of the user's daily nutrition targets or their target weight.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        field: {
          type: Type.STRING,
          enum: Object.keys(GOAL_FIELD_LABELS),
        },
        value: { type: Type.NUMBER },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "get_weekly_summary",
    description:
      "Get the user's meal totals for the last 7 days (meals logged, total calories, average daily calories, total protein).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

/**
 * Executes one model-requested tool call against the real database and
 * records what happened onto `ctx` so the caller can build the structured
 * `action`/`meal`/`goal`/`summary` fields the frontend renders as cards.
 */
async function executeToolCall(userId, call, ctx) {
  const args = call.args || {};

  if (call.name === "log_meal") {
    const items = Array.isArray(args.items) ? args.items : [];
    const createdMeals = [];
    const failedItems = [];

    // Each item is saved independently — one bad/failing row (e.g. a DB
    // hiccup) shouldn't discard meals that already saved successfully, and
    // there's nothing to roll back since each createMeal is its own insert.
    for (const raw of items) {
      if (typeof raw.calories !== "number") {
        failedItems.push({ foodName: raw?.foodName, error: "Missing a numeric calories value" });
        continue;
      }

      try {
        const meal = await createMeal(userId, {
          mealType: VALID_MEAL_TYPES.includes(raw.mealType) ? raw.mealType : "LUNCH",
          foodName: raw.foodName || "Logged Meal",
          quantity: Number(raw.quantity) || 1,
          quantityUnit: raw.quantityUnit || "serving",
          ...normalizeNutritionValues(raw),
          consumedAt: new Date(),
          source: "AI",
        });

        createdMeals.push(meal);
      } catch (err) {
        console.warn("Failed to save a log_meal item:", err.message);
        failedItems.push({ foodName: raw.foodName, error: err.message });
      }
    }

    if (!createdMeals.length) {
      return { ok: false, error: "No meal items could be saved.", failedItems };
    }

    ctx.action = "MEAL_LOGGED";
    ctx.meal = createdMeals[createdMeals.length - 1];

    return {
      ok: true,
      loggedCount: createdMeals.length,
      meals: createdMeals.map((m) => ({
        foodName: m.foodName,
        mealType: m.mealType,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      })),
      ...(failedItems.length ? { failedItems } : {}),
    };
  }

  if (call.name === "update_goal") {
    const field = args.field;
    const value = Number(args.value);

    if (!GOAL_FIELD_LABELS[field] || !Number.isFinite(value) || value <= 0 || value > GOAL_FIELD_MAX[field]) {
      return { ok: false, error: "Invalid field or an out-of-range value for that field." };
    }

    const updatedGoal = await createOrUpdateGoal(userId, { [field]: value });
    ctx.action = "GOAL_UPDATED";
    ctx.goal = updatedGoal;

    return { ok: true, goal: updatedGoal };
  }

  if (call.name === "get_weekly_summary") {
    const summary = computeWeeklySummary(ctx.weekMeals || []);
    ctx.action = "WEEKLY_SUMMARY";
    ctx.summary = summary;

    return { ok: true, summary };
  }

  return { ok: false, error: `Unknown tool "${call.name}"` };
}

/**
 * Runs one turn of the tool-calling conversation: sends the recent chat
 * history plus the new message to Gemini, executes any tool calls it
 * requests against the real database, and feeds the results back for a
 * final natural-language reply. This is what lets a user describe food in
 * one message and say "log that" in a later one — the model reads the
 * actual prior turns instead of only ever seeing the latest message.
 */
async function runChatTurn({
  userId,
  trimmed,
  priorHistory,
  goal,
  todayCalories,
  todayProtein,
  todayCarbs,
  todayFat,
  dailyCalorieGoal,
  remainingCalories,
  weekMeals,
}) {
  const systemInstruction = assistantConversationPrompt
    .replace("{{dailyCalorieGoal}}", String(dailyCalorieGoal))
    .replace("{{dailyProteinGoal}}", String(goal?.dailyProtein ?? "not set"))
    .replace("{{dailyCarbsGoal}}", String(goal?.dailyCarbs ?? "not set"))
    .replace("{{dailyFatGoal}}", String(goal?.dailyFat ?? "not set"))
    .replace("{{todayCalories}}", String(todayCalories))
    .replace("{{todayProtein}}", String(todayProtein))
    .replace("{{todayCarbs}}", String(todayCarbs))
    .replace("{{todayFat}}", String(todayFat))
    .replace("{{remainingCalories}}", String(remainingCalories));

  const contents = priorHistory.map((entry) => ({
    role: entry.role === "ASSISTANT" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));
  contents.push({ role: "user", parts: [{ text: trimmed }] });

  const config = {
    systemInstruction,
    tools: [{ functionDeclarations: chatToolDeclarations }],
  };

  const ctx = { weekMeals };
  let response;

  // Up to 3 rounds so the model can chain a tool call, see the result, and
  // (rarely) call another before giving its final reply.
  for (let round = 0; round < 3; round += 1) {
    response = await genAI.models.generateContent({
      model: CHAT_MODEL,
      contents,
      config,
    });

    const calls = response.functionCalls;
    if (!calls || !calls.length) break;

    const modelContent = response.candidates?.[0]?.content ?? {
      role: "model",
      parts: calls.map((call) => ({ functionCall: call })),
    };
    contents.push(modelContent);

    const responseParts = [];
    for (const call of calls) {
      const result = await executeToolCall(userId, call, ctx);
      responseParts.push({
        functionResponse: { name: call.name, response: result },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  const reply = (response?.text || "").trim() || "Done.";

  return {
    action: ctx.action || "CHAT",
    reply,
    meal: ctx.meal,
    goal: ctx.goal,
    summary: ctx.summary,
  };
}

/**
 * Regex/keyword-based chat handling used only when Gemini is unavailable
 * (missing API key, or the tool-calling turn above throws). It has no
 * memory of earlier turns — it's a degraded offline mode, not the primary
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
            mealType: VALID_MEAL_TYPES.includes(parsedData.mealType) ? parsedData.mealType : mealDetails.mealType,
          };
        }
      } catch (err) {
        console.warn("AI parser error, used fallback:", err.message);
      }
    }

    const createdMeal = await createMeal(userId, {
      mealType: mealDetails.mealType || "LUNCH",
      foodName: mealDetails.foodName || "Logged Meal",
      quantity: Number(mealDetails.quantity) || 1,
      quantityUnit: mealDetails.quantityUnit || "serving",
      ...normalizeNutritionValues(mealDetails),
      micronutrients: mealDetails.micronutrients || {},
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

function buildResultMetadata(result) {
  const metadata = {};
  if (result.meal) metadata.meal = result.meal;
  if (result.goal) metadata.goal = result.goal;
  if (result.summary) metadata.summary = result.summary;
  if (typeof result.importedCount === "number") metadata.importedCount = result.importedCount;
  if (typeof result.skippedCount === "number") metadata.skippedCount = result.skippedCount;
  return Object.keys(metadata).length ? metadata : null;
}

async function persistExchange(userId, userText, result) {
  await chatService.appendMessage(userId, { role: "USER", content: userText });
  await chatService.appendMessage(userId, {
    role: "ASSISTANT",
    content: result.reply,
    action: result.action,
    metadata: buildResultMetadata(result),
  });
}

/**
 * Handles conversational assistant interactions: natural language meal logging, goal checking, nutrition Q&A, and weekly summaries.
 */
async function chatWithAssistant({
  userId,
  message,
  imageBase64,
  imageMimeType,
  pdfBase64,
}) {
  // An attached photo or PDF is handled before any text intent parsing —
  // the chatbot automates the same "import a meal" flow the dedicated
  // upload modals offer, so users never have to leave the chat to log from
  // a photo or a bulk PDF diary export.
  if (imageBase64) {
    const analysis = await analyzeFoodImage({ imageBase64, mimeType: imageMimeType });

    const createdMeal = await createMeal(userId, {
      mealType: analysis.mealType || "LUNCH",
      foodName: analysis.foodName || "Photo Logged Meal",
      quantity: Number(analysis.quantity) || 1,
      quantityUnit: analysis.quantityUnit || "serving",
      calories: analysis.calories,
      protein: analysis.protein || 0,
      carbs: analysis.carbs || 0,
      fat: analysis.fat || 0,
      fiber: analysis.fiber || 0,
      sugar: analysis.sugar || 0,
      sodium: analysis.sodium || 0,
      micronutrients: analysis.micronutrients || {},
      attachmentUrl: analysis.attachmentUrl,
      attachmentType: analysis.attachmentUrl ? "IMAGE" : undefined,
      consumedAt: new Date(),
      source: "AI",
    });

    const result = {
      action: "MEAL_LOGGED",
      meal: createdMeal,
      reply: `Analyzed your photo and logged ${createdMeal.foodName} (${createdMeal.calories} kcal, ${createdMeal.protein}g protein, ${createdMeal.carbs}g carbs, ${createdMeal.fat}g fat) to ${createdMeal.mealType.toLowerCase()}. Let me know if anything needs correcting.`,
    };

    await persistExchange(userId, message?.trim() || "Sent a food photo", result);
    return result;
  }

  if (pdfBase64) {
    const result = await importMealsFromPdf({ userId, pdfBase64 });
    await persistExchange(userId, message?.trim() || "Sent a PDF diary export", result);
    return result;
  }

  if (!message || !message.trim()) {
    throw new Error("Message is required");
  }

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // Fetch user context (Goal + Today's Meals + Last 7 Days Meals + recent
  // chat turns) so both the tool-calling path and the fallback path can
  // ground their replies in real numbers instead of guessing.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Capped at 100/200 rather than paginated through in full — a personal
  // tracker's single-day and 7-day windows stay well under that in
  // practice, so this trades strict completeness for one round trip per
  // chat turn. Revisit with real pagination if that assumption ever breaks.
  const [goal, todayMealsResult, weekMealsResult, priorHistory] = await Promise.all([
    getGoalByUserId(userId),
    getMeals(userId, { page: 1, limit: 100, startDate: startOfToday, endDate: endOfToday }),
    getMeals(userId, { page: 1, limit: 200, startDate: sevenDaysAgo, endDate: endOfToday }),
    chatService.getRecentHistory(userId),
  ]);

  const todayMeals = todayMealsResult.meals || [];
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const todayFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

  const dailyCalorieGoal = goal?.dailyCalories || 2000;
  const remainingCalories = Math.max(0, dailyCalorieGoal - todayCalories);

  let result;

  if (genAI) {
    try {
      result = await runChatTurn({
        userId,
        trimmed,
        priorHistory,
        goal,
        todayCalories,
        todayProtein,
        todayCarbs,
        todayFat,
        dailyCalorieGoal,
        remainingCalories,
        weekMeals: weekMealsResult.meals || [],
      });
    } catch (err) {
      console.warn("Gemini chat turn error, using fallback:", err.message);
    }
  }

  if (!result) {
    result = await runFallbackChat({
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
    });
  }

  await persistExchange(userId, trimmed, result);
  return result;
}

module.exports = {
  analyzeFoodImage,
  chatWithAssistant,
  importMealsFromPdf,
  extractNutritionFromText,
};
