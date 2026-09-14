const { z } = require("zod");

const { chatWithAssistant } = require("../services/ai/ai.service");
const { analyzeFoodImage } = require("../services/ai/attachment.service");
const { extractNutritionFromText } = require("../services/ai/meal-extraction.service");
const chatService = require("../services/chat.service");

async function analyzeImage(req, res, next) {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "imageBase64 is required",
      });
    }

    const analysis = await analyzeFoodImage({ imageBase64, mimeType });

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

const extractNutritionSchema = z.object({
  description: z.string().trim().min(1, "description is required").max(500),
});

async function extractNutrition(req, res, next) {
  try {
    const { description } = extractNutritionSchema.parse(req.body);

    const data = await extractNutritionFromText(description);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// Minutes from `Date.prototype.getTimezoneOffset()` on the client, so "today"
// and date questions use the user's calendar day rather than the server's.
const tzOffsetSchema = z.coerce.number().int().min(-840).max(840).default(0);

async function chat(req, res, next) {
  try {
    const { message, imageBase64, imageMimeType, pdfBase64 } = req.body;
    const tzOffset = tzOffsetSchema.parse(req.body.tzOffset);

    if (!message?.trim() && !imageBase64 && !pdfBase64) {
      return res.status(400).json({
        success: false,
        message: "Message, image, or PDF is required",
      });
    }

    const response = await chatWithAssistant({
      userId: req.user.id,
      message,
      imageBase64,
      imageMimeType,
      pdfBase64,
      tzOffset,
    });

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    next(error);
  }
}

async function getChatHistory(req, res, next) {
  try {
    const messages = await chatService.getChatHistory(req.user.id);

    res.json({
      success: true,
      data: messages.map((entry) => ({
        id: entry.id,
        sender: entry.role === "ASSISTANT" ? "assistant" : "user",
        text: entry.content,
        action: entry.action || undefined,
        meal: entry.metadata?.meal,
        goal: entry.metadata?.goal,
        summary: entry.metadata?.summary,
        importedCount: entry.metadata?.importedCount,
        skippedCount: entry.metadata?.skippedCount,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeImage,
  extractNutrition,
  chat,
  getChatHistory,
};
