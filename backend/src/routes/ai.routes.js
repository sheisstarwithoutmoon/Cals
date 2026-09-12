const express = require("express");
const { analyzeImage, extractNutrition, chat } = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/analyze-image", analyzeImage);
router.post("/extract-nutrition", extractNutrition);
router.post("/chat", chat);

module.exports = router;
