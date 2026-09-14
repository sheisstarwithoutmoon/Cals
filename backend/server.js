const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { frontendUrl, port } = require("./src/config/env");
const authRoutes = require("./src/routes/auth.routes");
const goalRoutes = require("./src/routes/goal.routes");
const mealRoutes = require("./src/routes/meal.routes");
const aiRoutes = require("./src/routes/ai.routes");
const onboardingRoutes = require("./src/routes/onboarding.routes");
const profileRoutes = require("./src/routes/profile.routes");

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Cals API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/profile", profileRoutes);

app.use((error, req, res, next) => {
  console.error("API Error:", error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues,
    });
  }

  // Only expose messages for explicit client/operational errors (4xx)
  if (error.statusCode && error.statusCode < 500) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || "Invalid request",
      errors: error.errors,
    });
  }

  // For 500s or unexpected system/database errors, return safe generic message
  res.status(500).json({
    success: false,
    message: "Unable to connect to the service. Please try again in a moment.",
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});