const {
  createMeal,
  getMealsForDay,
  getMeals,
  localDayRange,
  addItemsToMeal,
} = require("../meal.service");
const { createOrUpdateGoal } = require("../goal.service");
const {
  logMealArgsSchema,
  addToMealArgsSchema,
  updateGoalArgsSchema,
  getDailySummaryArgsSchema,
  getWeeklySummaryArgsSchema,
} = require("../../schemas/ai-tool.schema");
const { normalizeMealItem, computeWeeklySummary } = require("./nutrition-helpers");

const TOOL_ARGUMENT_ERROR = "ToolArgumentError";

function toolArgumentError(message) {
  const error = new Error(message);
  error.name = TOOL_ARGUMENT_ERROR;
  error.statusCode = 400;
  return error;
}

function isToolArgumentError(error) {
  return error?.name === TOOL_ARGUMENT_ERROR;
}

/**
 * Checks a tool call's arguments against its schema and returns the parsed
 * arguments, or throws a ToolArgumentError listing every problem found.
 */
function validateArgs(toolName, schema, args) {
  const result = schema.safeParse(args ?? {});

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join("; ");
    throw toolArgumentError(`Invalid arguments for ${toolName}: ${problems}`);
  }

  return result.data;
}

async function addToMeal(userId, args, ctx) {
  const meal = await addItemsToMeal(userId, args.mealId, args.items);

  ctx.action = "MEAL_UPDATED";
  ctx.meal = meal;

  return {
    ok: true,
    meal: {
      id: meal.id,
      mealType: meal.mealType,
      foodName: meal.foodName,
      consumedAt: meal.consumedAt,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      items: meal.items,
    },
  };
}

async function logMeal(userId, args, ctx) {
  const createdMeals = [];
  const failedMeals = [];

  // Each meal is saved independently — one failing meal (e.g. a DB hiccup)
  // shouldn't discard meals that already saved successfully, and there's
  // nothing to roll back since each createMeal is its own insert.
  for (const entry of args.meals) {
    const items = entry.items.map(normalizeMealItem).filter(Boolean);
    const foodNames = items.map((item) => item.name).join(", ");

    try {
      // Saved with its items, like a manually logged meal: the meal's name
      // and totals are derived from the items by the meal service.
      const meal = await createMeal(userId, {
        mealType: entry.mealType,
        items,
        consumedAt: new Date(),
        source: "AI",
      });

      createdMeals.push(meal);
    } catch (err) {
      console.warn("Failed to save a log_meal meal:", err.message);
      failedMeals.push({ foodName: foodNames, error: err.message });
    }
  }

  if (!createdMeals.length) {
    return { ok: false, error: "No meals could be saved.", failedMeals };
  }

  ctx.action = "MEAL_LOGGED";
  ctx.meal = createdMeals[createdMeals.length - 1];

  return {
    ok: true,
    loggedCount: createdMeals.length,
    meals: createdMeals.map((m) => ({
      id: m.id,
      foodName: m.foodName,
      mealType: m.mealType,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      items: m.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        calories: item.calories,
      })),
    })),
    ...(failedMeals.length ? { failedMeals } : {}),
  };
}

async function updateGoal(userId, args, ctx) {
  const updatedGoal = await createOrUpdateGoal(userId, { [args.field]: args.value });
  ctx.action = "GOAL_UPDATED";
  ctx.goal = updatedGoal;

  return { ok: true, goal: updatedGoal };
}

function sumNutrient(meals, key) {
  return Math.round(meals.reduce((sum, m) => sum + (m[key] || 0), 0) * 10) / 10;
}

/**
 * Looks up one local calendar day's meals. The result keeps "nothing logged"
 * (`ok: true, mealCount: 0`) distinct from "the lookup failed" (`ok: false,
 * errorType: "FETCH_FAILED"`), so the model never reports a failed query as
 * an empty day.
 */
async function getDailySummary(userId, args, ctx) {
  const tzOffset = ctx.tzOffset ?? 0;
  let meals;

  try {
    meals = await getMealsForDay(userId, { date: args.date, mealType: args.mealType, tzOffset });
  } catch (err) {
    console.warn("get_daily_summary lookup failed:", err.message);
    return {
      ok: false,
      errorType: "FETCH_FAILED",
      error: "Meal data could not be retrieved right now. This does not mean nothing was logged.",
    };
  }

  const scope = args.mealType ? args.mealType.toLowerCase() : "meals";

  return {
    ok: true,
    date: args.date,
    mealType: args.mealType ?? null,
    mealCount: meals.length,
    ...(meals.length
      ? {}
      : { note: `No ${scope} were logged on ${args.date}.` }),
    meals: meals.map((m) => ({
      id: m.id,
      foodName: m.foodName,
      mealType: m.mealType,
      localTime: new Date(m.consumedAt.getTime() - tzOffset * 60 * 1000).toISOString().slice(11, 16),
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      items: m.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        calories: item.calories,
      })),
    })),
    totals: {
      calories: sumNutrient(meals, "calories"),
      protein: sumNutrient(meals, "protein"),
      carbs: sumNutrient(meals, "carbs"),
      fat: sumNutrient(meals, "fat"),
    },
  };
}

async function getWeeklySummary(userId, args, ctx) {
  const tzOffset = ctx.tzOffset ?? 0;

  try {
    const { start: startOfPeriod } = localDayRange(
      args.startDate,
      tzOffset
    );

    const { end: endOfPeriod } = localDayRange(
      args.endDate,
      tzOffset
    );

    const result = await getMeals(userId, {
      page: 1,
      limit: 200,
      startDate: startOfPeriod,
      endDate: endOfPeriod,
    });

    const summary = computeWeeklySummary(result.meals || []);

    ctx.action = "WEEKLY_SUMMARY";
    ctx.summary = {
      ...summary,
      startDate: args.startDate,
      endDate: args.endDate,
    };

    return {
      ok: true,
      startDate: args.startDate,
      endDate: args.endDate,
      summary,
    };
  } catch (err) {
    console.warn("get_weekly_summary lookup failed:", err.message);

    return {
      ok: false,
      errorType: "FETCH_FAILED",
      error: "Meal data could not be retrieved right now. This does not mean the period was empty.",
    };
  }
}

const TOOL_HANDLERS = {
  log_meal: { schema: logMealArgsSchema, handler: logMeal },
  add_to_meal: { schema: addToMealArgsSchema, handler: addToMeal },
  update_goal: { schema: updateGoalArgsSchema, handler: updateGoal },
  get_daily_summary: { schema: getDailySummaryArgsSchema, handler: getDailySummary },
  get_weekly_summary: { schema: getWeeklySummaryArgsSchema, handler: getWeeklySummary },
};

/**
 * Executes one model-requested tool call against the real database and
 * records what happened onto `ctx` so the caller can build the structured
 * `action`/`meal`/`goal`/`summary` fields the frontend renders as cards.
 *
 * Throws a ToolArgumentError for an unknown tool or invalid arguments before
 * anything is written.
 */
async function executeToolCall(userId, call, ctx) {
  const tool = TOOL_HANDLERS[call.name];

  if (!tool) {
    throw toolArgumentError(`Unknown tool "${call.name}"`);
  }

  const args = validateArgs(call.name, tool.schema, call.args);
  return tool.handler(userId, args, ctx);
}

module.exports = {
  executeToolCall,
  isToolArgumentError,
};
