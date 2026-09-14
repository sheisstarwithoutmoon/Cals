const { createMeal, createMealsBulk, buildMealData } = require("../meal.service");
const { uploadAttachment } = require("../upload.service");
const { loadPrompt } = require("../../utils/load-prompt");
const {
  isGeminiConfigured,
  generateWithGemini,
  VISION_MODEL,
  MEAL_EXTRACTION_MODEL,
  PDF_IMPORT_MODEL,
} = require("./gemini.client");
const {
  VALID_MEAL_TYPES,
  ITEM_NUTRIENT_KEYS,
  normalizeMealItem,
  buildMealEstimate,
  parseMealExtraction,
  cleanJson,
  scaleItemsToTotals,
} = require("./nutrition-helpers");
const { fallbackNutritionEstimate } = require("./fallback.service");

const imageNutritionPrompt = loadPrompt("image-nutrition.prompt.md");
const pdfDiaryImportPrompt = loadPrompt("pdf-diary-import.prompt.md");
const mealItemSplitPrompt = loadPrompt("meal-item-split.prompt.md");

// Gemini's inline-data limit is ~20MB per request. Bigger PDFs need the
// Files API (upload once, reference by URI) instead of base64 in the body.
const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;

// A diary PDF row only ever has a date, not a time of day. These give each
// meal type a sensible wall-clock time so same-day imports land in the
// right order instead of all sharing one timestamp.
const MEAL_TYPE_DEFAULT_TIME = {
  BREAKFAST: "08:00:00",
  LUNCH: "13:00:00",
  SNACK: "16:00:00",
  DINNER: "19:30:00",
};

// --- Images --------------------------------------------------------------

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

  if (isGeminiConfigured) {
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
 * Analyzes a food photo sent in chat and saves it as a meal immediately. The
 * chat has no review step, unlike the photo upload on the Meals page.
 */
async function logMealFromImage({ userId, imageBase64, mimeType }) {
  const analysis = await analyzeFoodImage({ imageBase64, mimeType });

  const createdMeal = await createMeal(userId, {
    mealType: analysis.mealType,
    foodName: analysis.foodName,
    items: analysis.items,
    attachmentUrl: analysis.attachmentUrl,
    attachmentType: analysis.attachmentUrl ? "IMAGE" : undefined,
    consumedAt: new Date(),
    source: "AI",
  });

  return {
    action: "MEAL_LOGGED",
    meal: createdMeal,
    reply: `Analyzed your photo and logged ${createdMeal.foodName} (${createdMeal.calories} kcal, ${createdMeal.protein}g protein, ${createdMeal.carbs}g carbs, ${createdMeal.fat}g fat) to ${createdMeal.mealType.toLowerCase()}. Let me know if anything needs correcting.`,
  };
}

// --- PDF diary imports -----------------------------------------------------

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

  if (!isGeminiConfigured) return rows;

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

  if (!isGeminiConfigured) {
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

module.exports = {
  analyzeFoodImage,
  logMealFromImage,
  parseMealsFromPdf,
  importMealsFromPdf,
};
