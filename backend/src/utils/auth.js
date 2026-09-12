const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { jwtSecret } = require("../config/env");

const COOKIE_NAME = "auth_token";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function generateToken(userId) {
  return jwt.sign(
    {
      userId,
    },
    jwtSecret,
    {
      expiresIn: "7d",
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

function generateOAuthState() {
  return crypto.randomBytes(32).toString("hex");
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateOAuthState,
  setAuthCookie,
  clearAuthCookie,
};