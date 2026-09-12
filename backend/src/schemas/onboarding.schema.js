const { z } = require("zod");

const activityLevelSchema = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);

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

const goalTypeInputSchema = z.object({
  goalType: goalTypeSchema,
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

module.exports = {
  activityLevelSchema,
  goalTypeSchema,
  profileSchema,
  goalTypeInputSchema,
  targetsSchema,
};
