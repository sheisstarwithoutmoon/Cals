import { apiFetch } from "@/lib/api/client";
import type { MealEntry, MealType } from "@/lib/types/api";

export interface ExtractedNutrition {
  foodName: string;
  mealType: MealType;
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
  confidence?: number;
}

export interface ChatResponse {
  success: boolean;
  action: "CHAT" | "MEAL_LOGGED" | "GOAL_CHECK" | "WEEKLY_SUMMARY";
  reply: string;
  meal?: MealEntry;
  summary?: {
    totalMealsLogged: number;
    totalWeekCalories: number;
    avgDailyCalories: number;
    totalProtein: number;
  };
}

export function analyzeImage(payload: { imageBase64: string; mimeType?: string }) {
  return apiFetch<{ success: true; data: ExtractedNutrition }>("/ai/analyze-image", {
    method: "POST",
    body: payload,
  });
}

export function sendChatMessage(payload: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  return apiFetch<ChatResponse>("/ai/chat", {
    method: "POST",
    body: payload,
  });
}
