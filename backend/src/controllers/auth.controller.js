const {
  registerSchema,
  loginSchema,
} = require("../schemas/auth.schema");

const {
  registerUser,
  loginUser,
  getUserById,
} = require("../services/auth.service");

const {
  setAuthCookie,
  clearAuthCookie,
} = require("../utils/auth");

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const result = await registerUser(data);

    setAuthCookie(res, result.token);

    res.status(201).json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const result = await loginUser(data);

    setAuthCookie(res, result.token);

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  clearAuthCookie(res);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

async function getCurrentUser(req, res, next) {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};