const express = require("express");

const {
  register,
  login,
  logout,
  getCurrentUser,
  startGoogleAuth,
  googleCallback,
} = require("../controllers/auth.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", requireAuth, getCurrentUser);

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);

module.exports = router;