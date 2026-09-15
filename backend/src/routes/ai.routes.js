const express = require("express");
const { analyzeImage, extractNutrition, chat, getChatHistory } = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  chatLimiter,
  imageAnalysisLimiter,
  nutritionExtractionLimiter,
} = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/analyze-image", imageAnalysisLimiter, analyzeImage);
router.post("/extract-nutrition", nutritionExtractionLimiter, extractNutrition);
router.get("/chat/history", getChatHistory);
router.post("/chat", chatLimiter, chat);

module.exports = router;
