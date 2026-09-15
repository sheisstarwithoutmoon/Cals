import type {
  ActivityLevel,
  BmiCategory,
  Gender,
  GoalType,
  HealthCondition,
  MealType,
} from "@/lib/types/api";

export const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

export const MEAL_TYPE_SORT_ORDER: Record<MealType, number> = {
  DINNER: 0,
  SNACK: 1,
  LUNCH: 2,
  BREAKFAST: 3,
};

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Mostly sitting",
  LIGHT: "Light activity",
  MODERATE: "Moderate activity",
  ACTIVE: "High activity",
  VERY_ACTIVE: "Very high activity",
};

export const ACTIVITY_LEVEL_DESCRIPTIONS: Record<ActivityLevel, string> = {
  SEDENTARY: "Desk work and little planned exercise",
  LIGHT: "Light exercise or walking 1 to 3 days a week",
  MODERATE: "Exercise about 3 to 5 days a week",
  ACTIVE: "Hard exercise 6 to 7 days a week",
  VERY_ACTIVE: "Hard training or a physically demanding job",
};

export const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export const GOAL_TYPES: GoalType[] = ["LOSE", "MAINTAIN", "GAIN"];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  LOSE: "Lose weight",
  MAINTAIN: "Maintain weight",
  GAIN: "Gain weight",
};

export const GOAL_TYPE_DESCRIPTIONS: Record<GoalType, string> = {
  LOSE: "A moderate calorie deficit to lose weight steadily.",
  MAINTAIN: "Enough calories to hold your current weight.",
  GAIN: "A calorie surplus to support gaining weight.",
};

export const HEALTH_CONDITIONS: HealthCondition[] = [
  "DIABETES",
  "HIGH_BLOOD_PRESSURE",
  "HEART_DISEASE",
  "KIDNEY_DISEASE",
  "THYROID",
  "PCOS",
  "PREGNANT_OR_BREASTFEEDING",
  "EATING_DISORDER",
];

export const HEALTH_CONDITION_LABELS: Record<HealthCondition, string> = {
  DIABETES: "Diabetes or prediabetes",
  HIGH_BLOOD_PRESSURE: "High blood pressure",
  HEART_DISEASE: "Heart condition",
  KIDNEY_DISEASE: "Kidney disease",
  THYROID: "Thyroid condition",
  PCOS: "PCOS",
  PREGNANT_OR_BREASTFEEDING: "Pregnant or breastfeeding",
  EATING_DISORDER: "History of an eating disorder",
};

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  UNDERWEIGHT: "Underweight",
  HEALTHY: "Healthy weight",
  OVERWEIGHT: "Overweight",
  OBESE: "Obese",
};

export const VITAMIN_MINERAL_KEYS = [
  "Vitamin A (mcg)",
  "Vitamin C (mg)",
  "Calcium (mg)",
  "Iron (mg)",
  "Potassium (mg)",
] as const;

/**
 * Approximate general adult daily reference values, used only to put
 * nutrients with very different units (mcg, mg, g) on one comparable
 * "% of daily value" scale in the reports charts.
 */
export const NUTRIENT_DAILY_VALUES: Record<string, number> = {
  "Vitamin A (mcg)": 900,
  "Vitamin C (mg)": 90,
  "Calcium (mg)": 1300,
  "Iron (mg)": 18,
  "Potassium (mg)": 4700,
  "Fiber (g)": 28,
  "Sugar (g)": 50,
  "Sodium (mg)": 2300,
};

export const DIET_PREFERENCES = [
  "VEGETARIAN",
  "VEGAN",
  "EGGETARIAN",
  "NON_VEGETARIAN",
  "KETO",
  "OTHER",
] as const;

export const DIET_PREFERENCE_LABELS: Record<string, string> = {
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  EGGETARIAN: "Eggetarian",
  NON_VEGETARIAN: "Non-Vegetarian",
  KETO: "Keto",
  OTHER: "Other / Flexible",
};

export const ALLERGY_INTOLERANCES = [
  "LACTOSE",
  "GLUTEN",
  "NUTS",
  "SOY",
  "EGGS",
  "SHELLFISH",
  "SESAME",
] as const;

export const ALLERGY_LABELS: Record<string, string> = {
  LACTOSE: "Dairy / Lactose",
  GLUTEN: "Gluten",
  NUTS: "Nuts & Peanuts",
  SOY: "Soy",
  EGGS: "Eggs",
  SHELLFISH: "Shellfish",
  SESAME: "Sesame",
};
