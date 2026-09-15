const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Sends the same `{ success: false, message }` shape the rest of the API
 * uses for errors, so a 429 looks like any other handled error to callers.
 */
function rateLimitHandler(message) {
  return (req, res) => {
    res.status(429).json({ success: false, message });
  };
}

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

/** IP-keyed limiter for unauthenticated auth endpoints (no req.user yet). */
function ipLimiter({ windowMs, max, message }) {
  return rateLimit({
    ...baseOptions,
    windowMs,
    max,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    handler: rateLimitHandler(message),
  });
}

/**
 * User+IP-keyed limiter for expensive authenticated endpoints. Only ever
 * mounted after `requireAuth` on routes that already require it, so
 * `req.user` is always set by the time this runs.
 */
function userLimiter({ windowMs, max, message }) {
  return rateLimit({
    ...baseOptions,
    windowMs,
    max,
    keyGenerator: (req) => `${req.user.id}:${ipKeyGenerator(req.ip)}`,
    handler: rateLimitHandler(message),
  });
}

const loginLimiter = ipLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

const registerLimiter = ipLimiter({
  windowMs: ONE_HOUR,
  max: 5,
  message: "Too many registration attempts. Please wait a while and try again.",
});

const chatLimiter = userLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 30,
  message: "Too many requests. Please wait a few minutes and try again.",
});

const imageAnalysisLimiter = userLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 15,
  message: "Too many requests. Please wait a few minutes and try again.",
});

const nutritionExtractionLimiter = userLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 20,
  message: "Too many requests. Please wait a few minutes and try again.",
});

const pdfImportLimiter = userLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  message: "Too many requests. Please wait a few minutes and try again.",
});

const bulkMealLimiter = userLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: "Too many requests. Please wait a few minutes and try again.",
});

module.exports = {
  loginLimiter,
  registerLimiter,
  chatLimiter,
  imageAnalysisLimiter,
  nutritionExtractionLimiter,
  pdfImportLimiter,
  bulkMealLimiter,
};
