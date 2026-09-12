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

/**
 * Express's query parser (`qs`) decodes query strings the same way it
 * decodes `application/x-www-form-urlencoded` bodies, which treats a
 * literal `+` as a space. Google's authorization codes are base64url-ish
 * but occasionally contain `+`, so reading it from `req.query` can silently
 * corrupt the code and turn a valid exchange into an "invalid_grant" error.
 * Pulling it straight off the raw query string with `decodeURIComponent`
 * (which never touches `+`) avoids that.
 */
function getRawQueryParam(req, key) {
  const queryString = req.originalUrl.split("?")[1] || "";

  for (const pair of queryString.split("&")) {
    const [rawKey, rawValue = ""] = pair.split("=");
    if (decodeURIComponent(rawKey) === key) {
      return decodeURIComponent(rawValue);
    }
  }

  return undefined;
}

async function googleCallback(req, res, next) {
  try {
    const code = getRawQueryParam(req, "code");
    const state = getRawQueryParam(req, "state");
    const savedState = req.cookies[GOOGLE_STATE_COOKIE];

    clearGoogleStateCookie(res);

    if (!state || !savedState || state !== savedState) {
      return res.redirect(`${frontendUrl}/login?error=google_state_mismatch`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_missing_code`);
    }

    const { tokens } = await googleClient.getToken(code);

    if (!tokens.id_token) {
      return res.redirect(`${frontendUrl}/login?error=google_no_identity_token`);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.redirect(`${frontendUrl}/login?error=google_verification_failed`);
    }

    const {
      sub: googleId,
      email,
      email_verified: emailVerified,
      name,
    } = payload;

    if (!googleId || !email || !emailVerified) {
      return res.redirect(`${frontendUrl}/login?error=google_account_unverified`);
    }

    const result = await loginOrCreateGoogleUser({
      googleId,
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
    });

    setAuthCookie(res, result.token);

    res.redirect(
      `${frontendUrl}${result.user.onboardingCompleted ? "/dashboard" : "/onboarding"}`
    );
  } catch (error) {
    console.error(
      "Google OAuth callback failed:",
      error.response?.data || error.message
    );
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
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