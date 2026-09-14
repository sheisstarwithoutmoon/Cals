const { GoogleGenAI, Type } = require("@google/genai");
const { Prisma } = require("../generated/prisma/client");
const { getMeals, createMeal, createMealsBulk, buildMealData } = require("./meal.service");
const { getGoalByUserId, createOrUpdateGoal } = require("./goal.service");
const { loadPrompt } = require("../utils/load-prompt");
const { uploadAttachment } = require("./upload.service");
const chatService = require("./chat.service");

const imageNutritionPrompt = loadPrompt("image-nutrition.prompt.md");
const mealExtractionPrompt = loadPrompt("meal-extraction.prompt.md");
const pdfDiaryImportPrompt = loadPrompt("pdf-diary-import.prompt.md");
const mealItemSplitPrompt = loadPrompt("meal-item-split.prompt.md");
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
async function generateWithGemini({ model, promptText, filePart, json = false }) {
  const contents = filePart
    ? [{ text: promptText }, filePart]
    : promptText;

  const result = await genAI.models.generateContent({
    model,
    contents,
    // Structured extraction should be repeatable: the same food name or PDF
    // row must not produce different numbers on every run.
    ...(json
      ? { config: { temperature: 0, responseMimeType: "application/json" } }
      : {}),
  });

  return result.text;
}

const ITEM_NUTRIENT_KEYS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];

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
 * Coerces and validates one raw food row from a PDF diary import. Returns
 * null (so the row is skipped and reported, not silently mis-dated) when it
 * has no real date — a diary row with no readable date has no business being
 * dated "today" just because that's when the import ran.
 *
 * Diaries may or may not carry nutrition columns. When the row's values came
 * from the PDF (`nutritionFromPdf`), they're the source of truth and the
 * items are rescaled to add up to them. Otherwise the items' own estimates
 * are used. A row that came back with no usable values at all is marked
 * `pending` so `splitCombinedRows` estimates it from its name and quantity.
 */
function normalizePdfRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  if (Number.isNaN(new Date(`${raw.date}T00:00:00`).getTime())) return null;

  const mealType = VALID_MEAL_TYPES.includes(raw.mealType) ? raw.mealType : "LUNCH";
  const name = String(raw.foodName || "").trim() || "Imported item";
  const rowItem = normalizeMealItem({ ...raw, name });
  const hasPdfValues = raw.nutritionFromPdf !== false && Boolean(rowItem);

  const totals = hasPdfValues
    ? Object.fromEntries(
        ITEM_NUTRIENT_KEYS.filter((key) => Number.isFinite(Number(raw[key]))).map((key) => [
          key,
          rowItem[key],
        ])
      )
    : {};

  // Capture any image URL the model found in the PDF row.
  const imageUrl =
    typeof raw.imageUrl === "string" && /^https?:\/\//i.test(raw.imageUrl)
      ? raw.imageUrl
      : null;

  const parts = Array.isArray(raw.items)
    ? raw.items.map(normalizeMealItem).filter(Boolean)
    : [];

  if (parts.length) {
    return {
      date: raw.date,
      mealType,
      totals,
      imageUrl,
      items: hasPdfValues ? scaleItemsToTotals(parts, totals) : parts,
    };
  }

  if (rowItem) {
    return { date: raw.date, mealType, totals, imageUrl, items: [rowItem] };
  }

  const quantity = Number(raw.quantity);
  return {
    date: raw.date,
    mealType,
    totals,
    imageUrl,
    items: [],
    pending: {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      quantityUnit: String(raw.quantityUnit || "serving").slice(0, 50),
    },
  };
}

// Keeps each split request small enough for the model to handle reliably.
const SPLIT_BATCH_SIZE = 40;

function splitKey(item) {
  // `item` is either a normalized item or a pending row's name/quantity.
  return `${item.name.trim().toLowerCase()}|${item.quantity}|${item.quantityUnit.trim().toLowerCase()}`;
}

/**
 * Second pass over PDF rows: the model reading a whole PDF often copies a
 * combined row ("Rice cakes with almond butter") as one food, so every row
 * still holding a single item has its name sent to a short text-only split
 * request. Parts come back with estimated values that only set the split;
 * they're rescaled to the row's PDF values. Identical names are sent once.
 * If splitting fails, rows are returned unsplit rather than failing the
 * import.
 */
async function splitCombinedRows(rows) {
  const sourceOf = (row) => row.pending ?? (row.items.length === 1 ? row.items[0] : null);

  if (!genAI) return rows;

  const uniqueEntries = new Map();
  for (const row of rows) {
    const source = sourceOf(row);
    if (!source) continue;
    const key = splitKey(source);
    if (!uniqueEntries.has(key)) {
      const { name, quantity, quantityUnit } = source;
      uniqueEntries.set(key, { index: uniqueEntries.size, name, quantity, quantityUnit });
    }
  }

  const entries = Array.from(uniqueEntries.values());
  if (!entries.length) return rows;

  const batches = [];
  for (let start = 0; start < entries.length; start += SPLIT_BATCH_SIZE) {
    batches.push(entries.slice(start, start + SPLIT_BATCH_SIZE));
  }

  const partsByIndex = new Map();

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const responseText = await generateWithGemini({
          model: MEAL_EXTRACTION_MODEL,
          promptText: mealItemSplitPrompt.replace("{{entries}}", JSON.stringify(batch)),
          json: true,
        });
        const parsed = cleanJson(responseText);

        for (const result of Array.isArray(parsed) ? parsed : []) {
          const parts = Array.isArray(result?.items)
            ? result.items.map(normalizeMealItem).filter(Boolean)
            : [];
          if (Number.isInteger(result?.index) && parts.length) {
            partsByIndex.set(result.index, parts);
          }
        }
      } catch (err) {
        console.warn("Splitting PDF rows into items failed for a batch, keeping them whole:", err.message);
      }
    })
  );

  return rows.map((row) => {
    const source = sourceOf(row);
    if (!source) return row;

    const entry = uniqueEntries.get(splitKey(source));
    const parts = entry && partsByIndex.get(entry.index);

    // A pending row takes whatever came back, even a single estimated item;
    // an already-valued row is only replaced when it actually split.
    if (row.pending) {
      return parts ? { ...row, pending: undefined, items: scaleItemsToTotals(parts, row.totals) } : row;
    }

    return parts && parts.length >= 2
      ? { ...row, items: scaleItemsToTotals(parts, row.totals) }
      : row;
  });
}

/**
 * Groups normalized PDF rows into meal drafts: every row sharing a date and
 * meal type becomes one item of the same meal, in the order rows appeared.
 * Each draft carries its totals (summed like a saved meal) for display, plus
 * a calendar `date` and default `time` so the client can build the local
 * timestamp — the server doesn't know the user's timezone.
 */
function groupPdfRowsIntoMeals(rows) {
  const drafts = new Map();

  for (const row of rows) {
    const key = `${row.date}|${row.mealType}`;

    if (!drafts.has(key)) {
      drafts.set(key, {
        date: row.date,
        time: MEAL_TYPE_DEFAULT_TIME[row.mealType].slice(0, 5),
        mealType: row.mealType,
        items: [],
        imageUrl: null,
      });
    }

    const draft = drafts.get(key);
    draft.items.push(...row.items);
    // Use the first image URL found among rows in the same meal group.
    if (!draft.imageUrl && row.imageUrl) {
      draft.imageUrl = row.imageUrl;
    }
  }

  return Array.from(drafts.values()).map((draft) => {
    const { mealData } = buildMealData({ items: draft.items });
    return {
      ...draft,
      foodName: mealData.foodName,
      calories: mealData.calories,
      protein: mealData.protein,
      carbs: mealData.carbs,
      fat: mealData.fat,
      fiber: mealData.fiber,
      sugar: mealData.sugar,
      sodium: mealData.sodium,
    };
  });
}

/**
 * Downloads food images referenced by URL in PDF rows and uploads them to
 * Cloudinary. Each meal draft's `imageUrl` (a URL found in the PDF) is
 * fetched, uploaded, and replaced with a Cloudinary `attachmentUrl`. Failures
 * are silently ignored — a missing image should never block an import.
 */
async function uploadPdfMealImages(meals) {
  const draftsWithImages = meals.filter((m) => m.imageUrl);
  if (!draftsWithImages.length) return meals;

  await Promise.all(
    draftsWithImages.map(async (draft) => {
      try {
        const response = await fetch(draft.imageUrl, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) return;

        const buffer = Buffer.from(await response.arrayBuffer());
        const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;
        const url = await uploadAttachment(base64, "cals/meal-photos");

        if (url) {
          draft.attachmentUrl = url;
          draft.attachmentType = "IMAGE";
        }
      } catch (err) {
        console.warn(`Failed to download/upload PDF image ${draft.imageUrl}:`, err.message);
      }
    })
  );

  return meals;
}

/**
 * Parses a food-diary/nutrition-history PDF (tabular export) into meal
 * drafts without saving anything, so the user can review, edit and pick
 * which meals to add. Rows without a usable date or calorie value are
 * skipped and counted rather than failing the whole parse.
 */
async function parseMealsFromPdf({ pdfBase64 }) {
  if (!pdfBase64) {
    throw new Error("PDF data is required");
  }

  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const approxBytes = Math.floor((base64Data.length * 3) / 4);

  if (approxBytes > MAX_INLINE_PDF_BYTES) {
    const error = new Error(
      "This PDF is larger than 20 MB. Split the export into smaller date ranges and import them separately."
    );
    error.statusCode = 413;
    throw error;
  }

  if (!genAI) {
    throw new Error("PDF import requires the Gemini API to be configured (GEMINI_API_KEY missing).");
  }

  const responseText = await generateWithGemini({
    model: PDF_IMPORT_MODEL,
    promptText: pdfDiaryImportPrompt,
    json: true,
    filePart: {
      inlineData: {
        data: base64Data,
        mimeType: "application/pdf",
      },
    },
  });

  const parsed = cleanJson(responseText);
  const rawEntries = Array.isArray(parsed) ? parsed : [];

  if (!rawEntries.length) {
    const error = new Error("Couldn't find any meal rows in this PDF.");
    error.statusCode = 422;
    throw error;
  }

  const normalizedRows = rawEntries.map(normalizePdfRow).filter(Boolean);
  // Rows still pending couldn't be estimated either, so they're skipped.
  const rows = (await splitCombinedRows(normalizedRows)).filter((row) => row.items.length);

  if (!rows.length) {
    const error = new Error(
      "Found rows in the PDF, but couldn't read a date and food for any of them."
    );
    error.statusCode = 422;
    throw error;
  }

  return {
    meals: await uploadPdfMealImages(groupPdfRowsIntoMeals(rows)),
    rowCount: rawEntries.length,
    skippedCount: rawEntries.length - rows.length,
  };
}

/**
 * Parses a diary PDF and saves every meal in it immediately. Used by the chat
 * assistant, which has no review step; the Meals page previews first via
 * `parseMealsFromPdf` and saves the chosen meals through the bulk endpoint.
 */
async function importMealsFromPdf({ userId, pdfBase64 }) {
  const { meals, skippedCount } = await parseMealsFromPdf({ pdfBase64 });

  const { mealCount, itemCount } = await createMealsBulk(
    userId,
    meals.map((draft) => ({
      mealType: draft.mealType,
      consumedAt: new Date(`${draft.date}T${draft.time}:00`),
      source: "PDF_IMPORT",
      attachmentUrl: draft.attachmentUrl || null,
      attachmentType: draft.attachmentUrl ? "IMAGE" : null,
      items: draft.items,
    }))
  );

  return {
    action: "PDF_IMPORTED",
    importedCount: mealCount,
    itemCount,
    skippedCount,
    reply: `Imported ${mealCount} ${mealCount === 1 ? "meal" : "meals"} (${itemCount} ${
      itemCount === 1 ? "item" : "items"
    }) from the PDF${
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
        json: true,
      });
      const parsed = cleanJson(responseText);
      const estimate = parseMealExtraction(parsed, parsed?.foodName || "Photo meal");

      if (estimate) {
        return { ...estimate, confidence: parsed.confidence || 0.9, ...attachment };
      }

      console.warn(
        "Gemini vision response didn't match the expected schema, falling back to smart extractor. Raw response:",
        responseText
      );
    } catch (err) {
      console.warn("Gemini vision analysis encountered error, falling back to smart extractor:", err.message);
    }
  }

  // Fallback estimation
  const fallback = fallbackNutritionEstimate("Photo meal");
  return {
    ...buildMealEstimate({
      description: "Photo meal",
      mealType: fallback.mealType,
      items: [normalizeMealItem({ ...fallback, name: "Photo meal" })],
      confidence: 0.5,
    }),
    ...attachment,
  };
}

/**
 * Estimates nutrition from a free-text food description (e.g. a
 * comma-separated list of items in one meal) without an image — used by the
 * "Estimate with AI" action in the manual meal-logging form.
 */
async function extractNutritionFromText(description, { targetTotals } = {}) {
  if (!description || !description.trim()) {
    throw new Error("A food description is required");
  }

  const trimmed = description.trim();
  let estimate = null;

  if (genAI) {
    try {
      const prompt = mealExtractionPrompt.replace("{{message}}", trimmed);
      const responseText = await generateWithGemini({
        model: MEAL_EXTRACTION_MODEL,
        promptText: prompt,
        json: true,
      });
      estimate = parseMealExtraction(cleanJson(responseText), trimmed);

      if (!estimate) {
        console.warn(
          "Gemini meal extraction didn't match the expected schema, falling back. Raw response:",
          responseText
        );
      }
    } catch (err) {
      console.warn("Gemini text extraction encountered error, falling back to smart extractor:", err.message);
    }
  }

  estimate = estimate || fallbackMealEstimate(trimmed);

  // Splitting an existing meal (e.g. an imported one) must not change its
  // known nutrition: the AI decides the parts, the totals stay as they were.
  if (targetTotals) {
    return buildMealEstimate({
      description: trimmed,
      mealType: estimate.mealType,
      items: scaleItemsToTotals(estimate.items, targetTotals),
      confidence: estimate.confidence,
    });
  }

  return estimate;
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
    const description = trimmed.replace(/^(i ate|i had|log|add|record|just ate)\s+/i, "");
    let mealDetails = fallbackMealEstimate(description);

    if (genAI) {
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
      mealType: analysis.mealType,
      foodName: analysis.foodName,
      items: analysis.items,
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
  parseMealsFromPdf,
  extractNutritionFromText,
};
