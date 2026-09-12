const express = require("express");

const {
  getGoal,
  saveGoal,
} = require("../controllers/goal.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, getGoal);
router.post("/", requireAuth, saveGoal);

module.exports = router;