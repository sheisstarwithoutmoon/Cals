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

export interface OnboardingProfile {
  name: string;
  age: number | null;
  heightCm: number | null;
  currentWeight: number | null;
  activityLevel: ActivityLevel | null;
}

export interface OnboardingStatus {
  profile: OnboardingProfile;
  goalType: GoalType | null;
  onboardingCompleted: boolean;
  nextStep: 1 | 2 | 3 | null;
}

export interface OnboardingProfileInput {
  name: string;
  age: number;
  heightCm: number;
  currentWeight: number;
  activityLevel: ActivityLevel;
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
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
  consumedAt: string;
  source?: MealSource;
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

export interface ZodIssue {
  path: (string | number)[];
  message: string;
  code?: string;
}
