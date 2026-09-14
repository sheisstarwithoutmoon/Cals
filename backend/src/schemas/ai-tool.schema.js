const { z } = require("zod");

const {
  VALID_MEAL_TYPES,
  GOAL_FIELD_LABELS,
  GOAL_FIELD_MAX,
} = require("../services/ai/nutrition-helpers");

/**
 * Argument schemas for the chat model's function-calling tools. The model's
 * arguments are untrusted input, so tool-executor checks them against these
 * before any tool touches the database.
 */

// Distinguishes a missing required argument from one of the wrong type.
const typeError = (label, type) => ({
  error: (issue) => (issue.input === undefined ? `${label} is required` : `${label} must be ${type}`),
});

const optionalNutrient = (label) =>
  z.number().nonnegative(`${label} cannot be negative`).optional();

const logMealFoodSchema = z.object({
  name: z
    .string(typeError("name", "a string"))
    .trim()
    .min(1, "name is required")
    .max(120, "name must be at most 120 characters"),

  quantity: z.number().positive("quantity must be greater than 0").optional(),

  quantityUnit: z.string().trim().max(50, "quantityUnit must be at most 50 characters").optional(),

  calories: z
    .number(typeError("calories", "a number"))
    .nonnegative("calories cannot be negative"),

  protein: optionalNutrient("protein"),
  carbs: optionalNutrient("carbs"),
  fat: optionalNutrient("fat"),
  fiber: optionalNutrient("fiber"),
  sugar: optionalNutrient("sugar"),
  sodium: optionalNutrient("sodium"),
});

const logMealEntrySchema = z.object({
  mealType: z.enum(VALID_MEAL_TYPES, `mealType must be one of ${VALID_MEAL_TYPES.join(", ")}`),

  items: z
    .array(logMealFoodSchema, typeError("items", "an array"))
    .min(1, "items must contain at least one food")
    .max(50, "a meal can have at most 50 items"),
});

const logMealArgsSchema = z.object({
  meals: z
    .array(logMealEntrySchema, typeError("meals", "an array"))
    .min(1, "meals must contain at least one meal")
    .max(20, "log at most 20 meals at a time"),
});

const goalFields = Object.keys(GOAL_FIELD_LABELS);

const updateGoalArgsSchema = z
  .object({
    field: z.enum(goalFields, `field must be one of ${goalFields.join(", ")}`),
    value: z.number(typeError("value", "a number")).positive("value must be greater than 0"),
  })
  .superRefine((data, ctx) => {
    if (data.value > GOAL_FIELD_MAX[data.field]) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `value for ${data.field} must be at most ${GOAL_FIELD_MAX[data.field]}`,
      });
    }
  });

const addToMealArgsSchema = z.object({
  mealId: z
    .string(typeError("mealId", "a string"))
    .trim()
    .min(1, "mealId is required"),

  items: z
    .array(logMealFoodSchema, typeError("items", "an array"))
    .min(1, "items must contain at least one food")
    .max(50, "items must contain at most 50 foods"),
});

const getDailySummaryArgsSchema = z.object({
  date: z
    .string(typeError("date", "a string"))
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    }, "date must be a real calendar date"),

  mealType: z
    .enum(VALID_MEAL_TYPES, `mealType must be one of ${VALID_MEAL_TYPES.join(", ")}`)
    .optional(),
});

const getWeeklySummaryArgsSchema = z
  .object({
    startDate: z
      .string(typeError("startDate", "a string"))
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "startDate must be in YYYY-MM-DD format"
      ),

    endDate: z
      .string(typeError("endDate", "a string"))
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "endDate must be in YYYY-MM-DD format"
      ),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "startDate must be before or equal to endDate",
      });
    }
  });

module.exports = {
  logMealArgsSchema,
  updateGoalArgsSchema,
  addToMealArgsSchema,
  getDailySummaryArgsSchema,
  getWeeklySummaryArgsSchema,
};
