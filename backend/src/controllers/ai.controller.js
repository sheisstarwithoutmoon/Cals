const {
  analyzeFoodImage,
  chatWithAssistant,
  extractNutritionFromText,
} = require("../services/ai.service");

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

async function extractNutrition(req, res, next) {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "description is required",
      });
    }

    const data = await extractNutritionFromText(description);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function chat(req, res, next) {
  try {
    const { message, history, imageBase64, imageMimeType, pdfBase64 } = req.body;

    if (!message?.trim() && !imageBase64 && !pdfBase64) {
      return res.status(400).json({
        success: false,
        message: "Message, image, or PDF is required",
      });
    }

    const response = await chatWithAssistant({
      userId: req.user.id,
      message,
      history,
      imageBase64,
      imageMimeType,
      pdfBase64,
    });

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeImage,
  extractNutrition,
  chat,
};
