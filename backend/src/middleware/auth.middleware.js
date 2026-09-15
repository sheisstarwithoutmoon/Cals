const {
  COOKIE_NAME,
  verifyToken,
} = require("../utils/auth");

const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * The HTTP-only cookie is the primary browser auth mechanism, so it takes
 * priority; the Authorization header is a fallback for non-browser clients
 * (e.g. mobile apps, API scripts) that can't rely on cookies.
 */
function extractToken(req) {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const match = BEARER_PATTERN.exec(req.headers?.authorization || "");
  const headerToken = match?.[1]?.trim();
  return headerToken || null;
}

function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload = verifyToken(token);

    req.user = {
      id: payload.userId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

module.exports = {
  requireAuth,
};