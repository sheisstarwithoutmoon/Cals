import type { ActivityLevel, GoalType, MealType } from "@/lib/types/api";

export const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
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

