const { loadPrompt } = require("../../utils/load-prompt");
const {
  isGeminiConfigured,
  generateWithGemini,
  MEAL_EXTRACTION_MODEL,
} = require("./gemini.client");
const { parseMealExtraction, cleanJson } = require("./nutrition-helpers");
const { fallbackMealEstimate } = require("./fallback.service");

const mealExtractionPrompt = loadPrompt("meal-extraction.prompt.md");

/**
 * Estimates nutrition from a free-text food description (e.g. a
 * comma-separated list of items in one meal) without an image — used by the
 * "Estimate with AI" action in the manual meal-logging form.
 */
async function extractNutritionFromText(description) {
  if (!description || !description.trim()) {
    throw new Error("A food description is required");
  }

  const trimmed = description.trim();
  let estimate = null;

  if (isGeminiConfigured) {
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

  return estimate || fallbackMealEstimate(trimmed);
}

module.exports = {
  extractNutritionFromText,
};
