const { analyzeFoodImage, chatWithAssistant } = require("../services/ai.service");

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

async function chat(req, res, next) {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const response = await chatWithAssistant({
      userId: req.user.id,
      message,
      history,
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
  chat,
};
