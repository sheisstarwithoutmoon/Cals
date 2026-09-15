/**
 * Shared shapes returned by the Express backend.
 * Kept close to the Prisma schema + zod schemas in `backend/src`.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type MealSource = "MANUAL" | "AI" | "PDF_IMPORT";
export type AttachmentType = "IMAGE" | "PDF";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "VERY_ACTIVE";

export type GoalType = "LOSE" | "MAINTAIN" | "GAIN";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface OnboardingProfile {
  name: string;
  age: number | null;
  gender: Gender | null;
  heightCm: number | null;
  currentWeight: number | null;
  activityLevel: ActivityLevel | null;
}

export type HealthCondition =
  | "DIABETES"
  | "HIGH_BLOOD_PRESSURE"
  | "HEART_DISEASE"
  | "KIDNEY_DISEASE"
  | "THYROID"
  | "PCOS"
  | "PREGNANT_OR_BREASTFEEDING"
  | "EATING_DISORDER";

export type DietPreference =
  | "VEGETARIAN"
  | "VEGAN"
  | "EGGETARIAN"
  | "NON_VEGETARIAN"
  | "KETO"
  | "OTHER";

export type AllergyIntolerance =
  | "LACTOSE"
  | "GLUTEN"
  | "NUTS"
  | "SOY"
  | "EGGS"
  | "SHELLFISH"
  | "SESAME";

export type BmiCategory = "UNDERWEIGHT" | "HEALTHY" | "OVERWEIGHT" | "OBESE";

/** BMI, recommended goal and health-based limits, computed by the backend. */
export interface BodyAssessment {
  bmi: number;
  bmiCategory: BmiCategory;
  /** Weights (kg) giving a BMI of 18.5–24.9 at the user's height. */
  healthyWeightRange: { min: number; max: number };
  recommendedGoalType: GoalType;
  /** Nearest edge of the healthy range for LOSE/GAIN; null for MAINTAIN. */
  recommendedTargetWeight: number | null;
  recommendedWeightChangeKg: number;
  allowedGoalTypes: GoalType[];
  maxWeeklyChangeKg: { LOSE: number; GAIN: number };
  proteinGramsPerKg: number;
  notes: { tone: "caution" | "info"; message: string }[];
}

export interface OnboardingStatus {
  profile: OnboardingProfile;
  healthConditions: HealthCondition[];
  healthReviewed: boolean;
  dietPreference: DietPreference | null;
  allergies: AllergyIntolerance[];
  goalType: GoalType | null;
  targetWeight: number | null;
  weeklyWeightChangeKg: number | null;
  assessment: BodyAssessment | null;
  onboardingCompleted: boolean;
  nextStep: 1 | 2 | 3 | 4 | null;
}

export interface OnboardingProfileInput {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  currentWeight: number;
  activityLevel: ActivityLevel;
}

export interface GoalPlanInput {
  goalType: GoalType;
  /** Required for LOSE and GAIN. */
  targetWeight?: number;
  /** Planned weight change per week in kg; required for LOSE and GAIN. */
  weeklyWeightChangeKg?: number;
}

/** How the suggested calories get to the target weight. */
export interface WeightPlan {
  goalType: Exclude<GoalType, "MAINTAIN">;
  currentWeight: number;
  targetWeight: number;
  weeklyWeightChangeKg: number;
  weightChangeKg: number;
  /** Calories per day below (negative) or above maintenance actually applied. */
  dailyCalorieAdjustment: number;
  appliedWeeklyChangeKg: number;
  weeksToGoal: number | null;
  /** True when the 1200 kcal floor made the real pace slower than chosen. */
  limitedByMinimumCalories: boolean;
}

/** Body, health, weight goal and suggested targets, as shown on the Goals page. */
export interface ProfileView {
  profile: OnboardingProfile;
  healthConditions: HealthCondition[];
  healthReviewedAt: string | null;
  dietPreference: DietPreference | null;
  allergies: AllergyIntolerance[];
  goalType: GoalType | null;
  targetWeight: number | null;
  weeklyWeightChangeKg: number | null;
  assessment: BodyAssessment | null;
  plan: WeightPlan | null;
  suggestedTargets: OnboardingTargets | null;
  maintenanceCalories: number | null;
}

export interface ProfileUpdate {
  age?: number;
  gender?: Gender;
  heightCm?: number;
  currentWeight?: number;
  activityLevel?: ActivityLevel;
  healthConditions?: HealthCondition[];
  dietPreference?: DietPreference | null;
  allergies?: AllergyIntolerance[];
  goalType?: GoalType;
  targetWeight?: number | null;
  weeklyWeightChangeKg?: number | null;
}

export interface OnboardingTargets {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

export interface Goal {
  id: string;
  userId: string;
  dailyCalories: number | null;
  dailyProtein: number | null;
  dailyCarbs: number | null;
  dailyFat: number | null;
  targetWeight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  dailyCalories?: number;
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
  targetWeight?: number;
}

/** One food item within a meal; the meal's nutrition fields are the sum of its items. */
export interface MealItem {
  id: string;
  mealEntryId: string;
  position: number;
  name: string;
  quantity: number | null;
  quantityUnit: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  micronutrients: Record<string, number> | null;
}

export interface MealItemInput {
  name: string;
  quantity?: number | null;
  quantityUnit?: string | null;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  micronutrients?: Record<string, number> | null;
}

export interface MealEntry {
  id: string;
  userId: string;
  mealType: MealType;
  foodName: string;
  quantity: number | null;
  quantityUnit: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  micronutrients: Record<string, number> | null;
  attachmentUrl: string | null;
  attachmentType: AttachmentType | null;
  consumedAt: string;
  source: MealSource;
  createdAt: string;
  updatedAt: string;
  /** Empty for meals logged before per-item tracking existed. */
  items: MealItem[];
}

export interface MealInput {
  mealType: MealType;
  foodName: string;
  quantity?: number;
  quantityUnit?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  micronutrients?: Record<string, number>;
  /** `null` clears an existing attachment when editing. */
  attachmentUrl?: string | null;
  attachmentType?: AttachmentType | null;
  consumedAt: string;
  source?: MealSource;
  /** When sent, the server recomputes the meal totals from these items. */
  items?: MealItemInput[];
}

export interface MealReportDay extends MealNutritionTotals {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** 0 for days in the range with nothing logged. */
  mealCount: number;
}

/** Everything the reports show for one date range, from all meals in it. */
export interface MealReport {
  mealCount: number;
  itemCount: number;
  loggedDays: number;
  totals: MealNutritionTotals;
  /** Per logged day. */
  averages: MealNutritionTotals;
  /** Per logged day, keyed like "Iron (mg)". */
  micronutrientAverages: Record<string, number>;
  /** Every calendar day in the range, oldest first. */
  days: MealReportDay[];
  mealTypes: { mealType: MealType; calories: number; mealCount: number }[];
  /** Foods contributing the most calories, highest first. */
  topFoods: { name: string; calories: number; count: number }[];
}

/** One meal parsed from a diary PDF, not yet saved. */
export interface PdfMealDraft {
  /** Calendar day from the PDF, `YYYY-MM-DD`. */
  date: string;
  /** Default time of day for the meal type, `HH:mm`. */
  time: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  items: MealItemInput[];
  /** Cloudinary URL if a food image was found in the PDF and uploaded. */
  attachmentUrl?: string;
  attachmentType?: "IMAGE" | "PDF";
}

export interface PdfImportPreview {
  meals: PdfMealDraft[];
  rowCount: number;
  skippedCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface MealListResult {
  meals: MealEntry[];
  pagination: Pagination;
}

export interface MealListFilters {
  page?: number;
  limit?: number;
  mealType?: MealType;
  startDate?: string;
  endDate?: string;
}

export type MealSummaryFilters = Omit<MealListFilters, "page" | "limit">;

export interface MealNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface MealSummaryDay extends MealNutritionTotals {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  mealCount: number;
}

export interface MealSummary {
  mealCount: number;
  /** Number of distinct days in the range that have at least one entry. */
  loggedDays: number;
  /** Counts ignore the meal type filter so every tab can show its own total. */
  mealTypeCounts: Record<MealType | "ALL", number>;
  totals: MealNutritionTotals;
  /** Totals divided by `loggedDays`. */
  averages: MealNutritionTotals;
  days: MealSummaryDay[];
}

export interface ZodIssue {
  path: (string | number)[];
  message: string;
  code?: string;
}
