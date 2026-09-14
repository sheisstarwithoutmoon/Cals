const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
const isGeminiConfigured = Boolean(genAI);

// Centralized model names so a future model swap only happens in one place.
const VISION_MODEL = "gemini-3.5-flash-lite";
const MEAL_EXTRACTION_MODEL = "gemini-3.5-flash-lite";
const QUESTION_ANSWERING_MODEL = "gemini-3.5-flash-lite";
const PDF_IMPORT_MODEL = "gemini-3.5-flash-lite";
const CHAT_MODEL = "gemini-3.5-flash-lite";

function requireClient() {
  if (!genAI) {
    throw new Error("Gemini API is not configured (GEMINI_API_KEY missing).");
  }
  return genAI;
}

/**
 * Single-prompt Gemini call (optionally with one inline file part) that
 * returns the raw text response. Shared by the vision, extraction, PDF and
 * Q&A calls so they all use one request shape.
 */
async function generateWithGemini({ model, promptText, filePart, json = false }) {
  const contents = filePart
    ? [{ text: promptText }, filePart]
    : promptText;

  const result = await requireClient().models.generateContent({
    model,
    contents,
    // Structured extraction should be repeatable: the same food name or PDF
    // row must not produce different numbers on every run.
    ...(json
      ? { config: { temperature: 0, responseMimeType: "application/json" } }
      : {}),
  });

  return result.text;
}

/**
 * Multi-turn Gemini call with function-calling tools. Takes the conversation
 * contents, system instruction and tool declarations, and returns the raw SDK
 * response (text, functionCalls, candidates) untouched.
 */
async function generateChatResponse({ model = CHAT_MODEL, contents, systemInstruction, tools }) {
  return requireClient().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: tools }],
      // Deciding which tool to call (if any) and whether the newest message
      // continues an earlier topic is a routing judgment, not creative
      // writing — an unset (effectively ~1.0) temperature let the model
      // drift onto a previous turn's topic/date instead of the current
      // message. Low but nonzero keeps replies from reading robotic.
      temperature: 0.2,
    },
  });
}

module.exports = {
  isGeminiConfigured,
  generateWithGemini,
  generateChatResponse,
  VISION_MODEL,
  MEAL_EXTRACTION_MODEL,
  QUESTION_ANSWERING_MODEL,
  PDF_IMPORT_MODEL,
  CHAT_MODEL,
};
