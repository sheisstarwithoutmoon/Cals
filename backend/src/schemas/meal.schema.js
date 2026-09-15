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

const attachmentTypeSchema = z.enum(["IMAGE", "PDF"]);

const optionalNutrient = (label) =>
  z.number().nonnegative(`${label} cannot be negative`).nullable().optional();

const mealItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Every item needs a name")
    .max(120, "Item names must be at most 120 characters"),

  quantity: z
    .number()
    .positive("Quantity must be greater than 0")
    .nullable()
    .optional(),

  quantityUnit: z.string().trim().max(50).nullable().optional(),

  calories: z.number().nonnegative("Calories cannot be negative"),

  protein: optionalNutrient("Protein"),
  carbs: optionalNutrient("Carbs"),
  fat: optionalNutrient("Fat"),
  fiber: optionalNutrient("Fiber"),
  sugar: optionalNutrient("Sugar"),
  sodium: optionalNutrient("Sodium"),

  micronutrients: z
    .record(z.string(), z.number().nonnegative())
    .nullable()
    .optional(),
});

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

  // `null` clears an existing attachment when editing a meal.
  attachmentUrl: z.string().trim().max(2000).nullable().optional(),
  attachmentType: attachmentTypeSchema.nullable().optional(),

  consumedAt: z.coerce.date(),

  source: mealSourceSchema.optional(),

  // When present, the meal's nutrition totals are recomputed from these on
  // the server, and on update the meal's items are replaced by this list.
  items: z
    .array(mealItemSchema)
    .max(50, "A meal can have at most 50 items")
    .optional(),
});

const updateMealSchema = mealSchema.partial();

/**
 * Filters shared by the meal list and the meal summary endpoints, so both
 * always describe exactly the same set of entries.
 */
const mealFilterFields = {
  mealType: mealTypeSchema.optional(),

  startDate: z.coerce.date().optional(),

  endDate: z.coerce.date().optional(),
};

function validateDateOrder(data, ctx) {
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({
      code: "custom",
      path: ["startDate"],
      message: "The \"From\" date must be before the \"To\" date.",
    });
  }
}

const mealQuerySchema = z.object({
  ...mealFilterFields,

  page: z.coerce
    .number()
    .int()
    .positive("Page must be at least 1")
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),
}).superRefine(validateDateOrder);

const mealSummaryQuerySchema = z.object({
  ...mealFilterFields,

  // Minutes from `Date.prototype.getTimezoneOffset()` on the client, used to
  // bucket entries into the user's local calendar days rather than UTC days.
  tzOffset: z.coerce
    .number()
    .int()
    .min(-840)
    .max(840)
    .default(0),
}).superRefine(validateDateOrder);

const bulkMealsSchema = z.object({
  meals: z
    .array(mealSchema)
    .min(1, "Select at least one meal to add")
    .max(500, "Add at most 500 meals at a time"),
});

const pdfImportSchema = z.object({
  pdfBase64: z.string().min(1, "A PDF file is required"),
});

const mealPhotoSchema = z.object({
  imageBase64: z.string().min(1, "A photo is required"),
});

module.exports = {
  mealSchema,
  mealItemSchema,
  mealPhotoSchema,
  bulkMealsSchema,
  pdfImportSchema,
  updateMealSchema,
  mealQuerySchema,
  mealSummaryQuerySchema,
};
