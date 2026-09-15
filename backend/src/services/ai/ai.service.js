const { getMeals, toLocalDateKey, localDayRange } = require("../meal.service");
const { getGoalByUserId } = require("../goal.service");
const { requireUser } = require("../profile.service");
const { HEALTH_CONDITIONS } = require("../body-assessment.service");
const chatService = require("../chat.service");
const { loadPrompt } = require("../../utils/load-prompt");
const { isGeminiConfigured, generateChatResponse } = require("./gemini.client");
const { chatToolDeclarations } = require("./tool-declarations");
const { executeToolCall, isToolArgumentError } = require("./tool-executor");
const { analyzeFoodImage, importMealsFromPdf } = require("./attachment.service");
const { runFallbackChat } = require("./fallback.service");

const assistantConversationPrompt = loadPrompt(
  "assistant-conversation.prompt.md"
);

// Up to 3 rounds so the model can chain a tool call, see the result, and
// (rarely) call another before giving its final reply.
const MAX_TOOL_ROUNDS = 3;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Loads what a chat turn is grounded in: the user profile, goal, today's and
 * the last 7 days' meals, and recent chat turns, plus today's totals.
 */
async function loadUserContext(userId, tzOffset) {
  // "Today" is the user's calendar day (from the client's tz offset), not the
  // server's — a UTC server would otherwise put an IST user's evening meals
  // on the wrong day.
  const now = new Date();
  const todayDate = toLocalDateKey(now, tzOffset);
  const { start: startOfToday, end: endOfToday } = localDayRange(todayDate, tzOffset);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [user, goal, todayMealsResult, weekMealsResult, priorHistory] = await Promise.all([
    requireUser(userId),
    getGoalByUserId(userId),
    getMeals(userId, { page: 1, limit: 100, startDate: startOfToday, endDate: endOfToday }),
    getMeals(userId, { page: 1, limit: 200, startDate: sevenDaysAgo, endDate: endOfToday }),
    chatService.getRecentHistory(userId),
  ]);

  const todayMeals = todayMealsResult.meals || [];
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const dailyCalorieGoal = goal?.dailyCalories || 2000;

  return {
    tzOffset,
    todayDate,
    todayWeekday: WEEKDAYS[new Date(`${todayDate}T00:00:00Z`).getUTCDay()],
    user,
    goal,
    priorHistory,
    weekMealsResult,
    todayCalories,
    todayProtein: todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0),
    todayCarbs: todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0),
    todayFat: todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0),
    dailyCalorieGoal,
    remainingCalories: Math.max(0, dailyCalorieGoal - todayCalories),
  };
}

function buildSystemInstruction(context) {
  const { goal, user } = context;

  const dietPreference = user?.dietPreference || "Not specified";
  const allergies =
    user?.allergies && user.allergies.length ? user.allergies.join(", ") : "None reported";
  const healthConditions =
    user?.healthConditions && user.healthConditions.length
      ? user.healthConditions.map((key) => HEALTH_CONDITIONS[key] || key).join(", ")
      : "None reported";

  return assistantConversationPrompt
    .replace("{{todayDate}}", context.todayDate)
    .replace("{{todayWeekday}}", context.todayWeekday)
    .replace("{{dietPreference}}", dietPreference)
    .replace("{{allergies}}", allergies)
    .replace("{{healthConditions}}", healthConditions)
    .replace("{{dailyCalorieGoal}}", String(context.dailyCalorieGoal))
    .replace("{{dailyProteinGoal}}", String(goal?.dailyProtein ?? "not set"))
    .replace("{{dailyCarbsGoal}}", String(goal?.dailyCarbs ?? "not set"))
    .replace("{{dailyFatGoal}}", String(goal?.dailyFat ?? "not set"))
    .replace("{{todayCalories}}", String(context.todayCalories))
    .replace("{{todayProtein}}", String(context.todayProtein))
    .replace("{{todayCarbs}}", String(context.todayCarbs))
    .replace("{{todayFat}}", String(context.todayFat))
    .replace("{{remainingCalories}}", String(context.remainingCalories));
}

/**
 * Runs one tool call and returns the function response sent back to Gemini.
 * Invalid arguments are reported to the model as a failed result so it can
 * correct itself; any other error aborts the turn.
 */
async function runToolCall(userId, call, ctx) {
  try {
    return await executeToolCall(userId, call, ctx);
  } catch (err) {
    if (!isToolArgumentError(err)) throw err;
    console.warn("Rejected tool call:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Runs one turn of the tool-calling conversation: sends the recent chat
 * history plus the new message to Gemini, executes any tool calls it
 * requests, and feeds the results back for a final natural-language reply.
 * This is what lets a user describe food in one message and say "log that"
 * in a later one — the model reads the actual prior turns instead of only
 * ever seeing the latest message.
 */
async function runChatTurn({ userId, trimmed, context, imageAnalysis }) {
  const systemInstruction = buildSystemInstruction(context);

  const contents = context.priorHistory.map((entry) => ({
    role: entry.role === "ASSISTANT" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));
  const userParts = [{ text: trimmed }];

  if (imageAnalysis) {
    userParts.push({
      text: `The user also attached a food image. Here is the nutrition analysis of that image. Use this information to answer the user's question or log the food if they explicitly want it logged:

  ${JSON.stringify(imageAnalysis)}`,
    });
  }

  contents.push({ role: "user", parts: userParts });

  const ctx = { weekMeals: context.weekMealsResult.meals || [], tzOffset: context.tzOffset };
  let response;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    response = await generateChatResponse({
      contents,
      systemInstruction,
      tools: chatToolDeclarations,
    });

    const calls = response.functionCalls;
    if (!calls || !calls.length) break;

    contents.push(
      response.candidates?.[0]?.content ?? {
        role: "model",
        parts: calls.map((call) => ({ functionCall: call })),
      }
    );

    const responseParts = [];
    for (const call of calls) {
      const result = await runToolCall(userId, call, ctx);
      responseParts.push({
        functionResponse: { name: call.name, response: result },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    action: ctx.action || "CHAT",
    reply: (response?.text || "").trim() || "Done.",
    meal: ctx.meal,
    goal: ctx.goal,
    summary: ctx.summary,
  };
}

function buildResultMetadata(result) {
  const metadata = {};
  if (result.meal) metadata.meal = result.meal;
  if (result.goal) metadata.goal = result.goal;
  if (result.summary) metadata.summary = result.summary;
  if (typeof result.importedCount === "number") metadata.importedCount = result.importedCount;
  if (typeof result.skippedCount === "number") metadata.skippedCount = result.skippedCount;
  return Object.keys(metadata).length ? metadata : null;
}

async function persistExchange(userId, userText, result) {
  await chatService.appendMessage(userId, { role: "USER", content: userText });
  await chatService.appendMessage(userId, {
    role: "ASSISTANT",
    content: result.reply,
    action: result.action,
    metadata: buildResultMetadata(result),
  });
}

/**
 * Handles one chat message with optional image or PDF attachments.
 * Images are analyzed first and passed to Gemini so the model can decide
 * whether to answer the user's question or log the food.
 * PDFs are imported directly.
 */
async function chatWithAssistant({
  userId,
  message,
  imageBase64,
  imageMimeType,
  pdfBase64,
  tzOffset = 0,
}) {
  // An attached photo or PDF is handled before any text intent parsing —
  // the chatbot automates the same "import a meal" flow the dedicated
  // upload modals offer, so users never have to leave the chat to log from
  // a photo or a bulk PDF diary export.
  let imageAnalysis = null;

  if (imageBase64) {
    imageAnalysis = await analyzeFoodImage({
      imageBase64,
      mimeType: imageMimeType,
    });
  }

  if (pdfBase64) {
    const result = await importMealsFromPdf({ userId, pdfBase64 });
    await persistExchange(userId, message?.trim() || "Sent a PDF diary export", result);
    return result;
  }

  if (!message || !message.trim()) {
    throw new Error("Message is required");
  }

  const trimmed = message.trim();
  const context = await loadUserContext(userId, tzOffset);

  let result;

  if (isGeminiConfigured) {
    try {
      result = await runChatTurn({ userId, trimmed, context, imageAnalysis });
    } catch (err) {
      console.warn("Gemini chat turn error, using fallback:", err.message);
    }
  }

  if (!result) {
    result = await runFallbackChat({
      trimmed,
      lower: trimmed.toLowerCase(),
      userId,
      todayCalories: context.todayCalories,
      todayProtein: context.todayProtein,
      todayCarbs: context.todayCarbs,
      todayFat: context.todayFat,
      dailyCalorieGoal: context.dailyCalorieGoal,
      remainingCalories: context.remainingCalories,
      weekMealsResult: context.weekMealsResult,
    });
  }

  await persistExchange(userId, trimmed, result);
  return result;
}

module.exports = {
  chatWithAssistant,
};
