const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { frontendUrl, port } = require("./src/config/env");
const authRoutes = require("./src/routes/auth.routes");

const app = express();

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Cals API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues,
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});