const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { jwtSecret } = require("../config/env");

const COOKIE_NAME = "auth_token";
const GOOGLE_STATE_COOKIE = "google_oauth_state";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function generateToken(userId) {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });
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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
}

function setGoogleStateCookie(res, state) {
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });
}

function clearGoogleStateCookie(res) {
  res.clearCookie(GOOGLE_STATE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

module.exports = {
  COOKIE_NAME,
  GOOGLE_STATE_COOKIE,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateOAuthState,
  setAuthCookie,
  clearAuthCookie,
  setGoogleStateCookie,
  clearGoogleStateCookie,
};