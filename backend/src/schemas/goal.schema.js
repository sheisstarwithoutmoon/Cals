const { z } = require("zod");

const goalSchema = z.object({
  dailyCalories: z
    .number()
    .positive("Daily calories must be greater than 0")
    .optional(),

  dailyProtein: z
    .number()
    .nonnegative("Daily protein cannot be negative")
    .optional(),

  dailyCarbs: z
    .number()
    .nonnegative("Daily carbs cannot be negative")
    .optional(),

  dailyFat: z
    .number()
    .nonnegative("Daily fat cannot be negative")
    .optional(),

  targetWeight: z
    .number()
    .positive("Target weight must be greater than 0")
    .optional(),
});

module.exports = {
  goalSchema,
};