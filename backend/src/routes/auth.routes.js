const express = require("express");

const {
  register,
  login,
  logout,
  getCurrentUser,
  startGoogleAuth,
  googleCallback,
  checkEmail,
} = require("../controllers/auth.controller");

const { requireAuth } = require("../middleware/auth.middleware");
const { loginLimiter, registerLimiter } = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/check-email", checkEmail);

router.get("/me", requireAuth, getCurrentUser);

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);

module.exports = router;