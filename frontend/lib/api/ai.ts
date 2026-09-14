import { apiFetch } from "@/lib/api/client";
import type {
  AttachmentType,
  Goal,
  MealEntry,
  MealItemInput,
  MealType,
} from "@/lib/types/api";

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
  /** Per-item breakdown; present on text estimates, absent on photo scans. */
  items?: MealItemInput[];
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
}

export interface ChatResponse {
  success: boolean;
  action:
    | "CHAT"
    | "MEAL_LOGGED"
    | "GOAL_CHECK"
    | "GOAL_UPDATED"
    | "WEEKLY_SUMMARY"
    | "PDF_IMPORTED";
  reply: string;
  meal?: MealEntry;
  goal?: Goal;
  importedCount?: number;
  skippedCount?: number;
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

export function extractNutrition(payload: { description: string }) {
  return apiFetch<{ success: true; data: ExtractedNutrition }>("/ai/extract-nutrition", {
    method: "POST",
    body: payload,
  });
}

export function sendChatMessage(payload: {
  message: string;
  imageBase64?: string;
  imageMimeType?: string;
  pdfBase64?: string;
}) {
  return apiFetch<ChatResponse>("/ai/chat", {
    method: "POST",
    body: { ...payload, tzOffset: new Date().getTimezoneOffset() },
  });
}

export interface ChatHistoryMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: ChatResponse["action"];
  meal?: MealEntry;
  goal?: Goal;
  summary?: ChatResponse["summary"];
  importedCount?: number;
  skippedCount?: number;
  createdAt: string;
}

export function getChatHistory() {
  return apiFetch<{ success: true; data: ChatHistoryMessage[] }>("/ai/chat/history");
}
