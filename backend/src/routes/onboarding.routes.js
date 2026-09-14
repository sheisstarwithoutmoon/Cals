const express = require("express");

const {
  getStatus,
  updateProfile,
  updateGoalType,
  updateHealth,
  suggestedTargets,
  complete,
} = require("../controllers/onboarding.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/status", requireAuth, getStatus);
router.put("/profile", requireAuth, updateProfile);
router.put("/health", requireAuth, updateHealth);
router.put("/goal-type", requireAuth, updateGoalType);
router.get("/suggested-targets", requireAuth, suggestedTargets);
router.post("/complete", requireAuth, complete);

module.exports = router;
