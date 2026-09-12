const { OAuth2Client } = require("google-auth-library");

const {
  registerSchema,
  loginSchema,
} = require("../schemas/auth.schema");

const {
  registerUser,
  loginUser,
  getUserById,
  loginOrCreateGoogleUser,
} = require("../services/auth.service");

const {
  setAuthCookie,
  clearAuthCookie,
  generateOAuthState,
  setGoogleStateCookie,
  clearGoogleStateCookie,
  GOOGLE_STATE_COOKIE,
} = require("../utils/auth");

const {
  googleClientId,
  googleClientSecret,
  googleCallbackUrl,
  frontendUrl,
} = require("../config/env");

const googleClient = new OAuth2Client(
  googleClientId,
  googleClientSecret,
  googleCallbackUrl
);

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

function startGoogleAuth(req, res, next) {
  try {
    const state = generateOAuthState();

    setGoogleStateCookie(res, state);

    const authorizationUrl = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    });

    res.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
}

async function googleCallback(req, res, next) {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies[GOOGLE_STATE_COOKIE];

    clearGoogleStateCookie(res);

    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({
        success: false,
        message: "Invalid OAuth state",
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Google authorization code is missing",
      });
    }

    const { tokens } = await googleClient.getToken(code);

    if (!tokens.id_token) {
      return res.status(401).json({
        success: false,
        message: "Google did not return a valid identity token",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Unable to verify Google account",
      });
    }

    const {
      sub: googleId,
      email,
      email_verified: emailVerified,
      name,
    } = payload;

    if (!googleId || !email || !emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Google account information could not be verified",
      });
    }

    const result = await loginOrCreateGoogleUser({
      googleId,
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
    });

    setAuthCookie(res, result.token);

    res.redirect(frontendUrl);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  startGoogleAuth,
  googleCallback,
};