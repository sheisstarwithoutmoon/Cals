const { z } = require("zod");

const { HEALTH_CONDITION_KEYS } = require("../services/body-assessment.service");

const activityLevelSchema = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);

const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);

const goalTypeSchema = z.enum(["LOSE", "MAINTAIN", "GAIN"]);

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),

  age: z
    .number()
    .int("Age must be a whole number")
    .min(10, "Age must be at least 10")
    .max(120, "Age must be at most 120"),

  gender: genderSchema,

  heightCm: z
    .number()
    .positive("Height must be greater than 0")
    .max(300, "Height must be at most 300 cm"),

  currentWeight: z
    .number()
    .positive("Weight must be greater than 0")
    .max(500, "Weight must be at most 500 kg"),

  activityLevel: activityLevelSchema,
});

// Allowed weekly paces (kg/week) per goal; faster loss than 1 kg/week, or
// gain above 0.5 kg/week, is outside what's generally considered safe.
const WEEKLY_CHANGE_LIMITS = {
  LOSE: { min: 0.1, max: 1 },
  GAIN: { min: 0.1, max: 0.5 },
};

const goalTypeInputSchema = z
  .object({
    goalType: goalTypeSchema,

    targetWeight: z
      .number()
      .min(30, "Target weight must be at least 30 kg")
      .max(300, "Target weight must be at most 300 kg")
      .optional(),

    weeklyWeightChangeKg: z.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.goalType === "MAINTAIN") return;

    if (data.targetWeight == null) {
      ctx.addIssue({
        code: "custom",
        path: ["targetWeight"],
        message: "Enter your target weight",
      });
    }

    const limits = WEEKLY_CHANGE_LIMITS[data.goalType];
    const pace = data.weeklyWeightChangeKg;

    if (pace == null) {
      ctx.addIssue({
        code: "custom",
        path: ["weeklyWeightChangeKg"],
        message: "Choose a weekly pace",
      });
    } else if (pace < limits.min || pace > limits.max) {
      ctx.addIssue({
        code: "custom",
        path: ["weeklyWeightChangeKg"],
        message: `Choose a pace between ${limits.min} and ${limits.max} kg per week`,
      });
    }
  });

const targetsSchema = z.object({
  dailyCalories: z
    .number()
    .positive("Daily calories must be greater than 0")
    .max(10000, "Daily calories must be at most 10000"),

  dailyProtein: z
    .number()
    .nonnegative("Protein cannot be negative")
    .max(1000, "Protein must be at most 1000g"),

  dailyCarbs: z
    .number()
    .nonnegative("Carbs cannot be negative")
    .max(1500, "Carbs must be at most 1500g"),

  dailyFat: z
    .number()
    .nonnegative("Fat cannot be negative")
    .max(500, "Fat must be at most 500g"),
});

const healthConditionsSchema = z
  .array(z.enum(HEALTH_CONDITION_KEYS))
  .max(HEALTH_CONDITION_KEYS.length)
  .transform((conditions) => [...new Set(conditions)]);

const healthInputSchema = z.object({
  healthConditions: healthConditionsSchema,
});

/**
 * Partial profile edit from the Goals page. Goal plan rules that depend on
 * the user's current weight and health are checked in the profile service.
 */
const profileUpdateSchema = z
  .object({
    age: profileSchema.shape.age,
    gender: genderSchema,
    heightCm: profileSchema.shape.heightCm,
    currentWeight: profileSchema.shape.currentWeight,
    activityLevel: activityLevelSchema,
    healthConditions: healthConditionsSchema,
    goalType: goalTypeSchema,
    targetWeight: z
      .number()
      .min(30, "Target weight must be at least 30 kg")
      .max(300, "Target weight must be at most 300 kg")
      .nullable(),
    weeklyWeightChangeKg: z.number().positive().max(1).nullable(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (!data.goalType || data.goalType === "MAINTAIN") return;

    if (data.targetWeight == null) {
      ctx.addIssue({ code: "custom", path: ["targetWeight"], message: "Enter your target weight" });
    }

    if (data.weeklyWeightChangeKg == null) {
      ctx.addIssue({ code: "custom", path: ["weeklyWeightChangeKg"], message: "Choose a weekly pace" });
    }
  });

module.exports = {
  healthInputSchema,
  profileUpdateSchema,
  WEEKLY_CHANGE_LIMITS,
  activityLevelSchema,
  goalTypeSchema,
  profileSchema,
  goalTypeInputSchema,
  targetsSchema,
};
