const {
  COOKIE_NAME,
  verifyToken,
} = require("../utils/auth");

function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];

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