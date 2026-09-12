const { z } = require("zod");

const mealTypeSchema = z.enum([
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
]);

const mealSourceSchema = z.enum([
  "MANUAL",
  "AI",
  "PDF_IMPORT",
]);

const mealSchema = z.object({
  mealType: mealTypeSchema,

  foodName: z
    .string()
    .trim()
    .min(1, "Food name is required")
    .max(200, "Food name must be at most 200 characters"),

  quantity: z
    .number()
    .positive("Quantity must be greater than 0")
    .optional(),

  quantityUnit: z
    .string()
    .trim()
    .max(50, "Quantity unit must be at most 50 characters")
    .optional(),

  calories: z
    .number()
    .nonnegative("Calories cannot be negative"),

  protein: z
    .number()
    .nonnegative("Protein cannot be negative")
    .optional(),

  carbs: z
    .number()
    .nonnegative("Carbs cannot be negative")
    .optional(),

  fat: z
    .number()
    .nonnegative("Fat cannot be negative")
    .optional(),

  fiber: z
    .number()
    .nonnegative("Fiber cannot be negative")
    .optional(),

  sugar: z
    .number()
    .nonnegative("Sugar cannot be negative")
    .optional(),

  sodium: z
    .number()
    .nonnegative("Sodium cannot be negative")
    .optional(),

  micronutrients: z
    .record(z.string(), z.number().nonnegative())
    .optional(),

  consumedAt: z.coerce.date(),

  source: mealSourceSchema.optional(),
});

const updateMealSchema = mealSchema.partial();

const mealQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),

  mealType: mealTypeSchema.optional(),

  startDate: z.coerce.date().optional(),

  endDate: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({
      code: "custom",
      path: ["startDate"],
      message: "startDate must be before endDate",
    });
  }
});

module.exports = {
  mealSchema,
  updateMealSchema,
  mealQuerySchema,
};