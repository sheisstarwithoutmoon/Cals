import { apiFetch } from "@/lib/api/client";
import type {
  MealEntry,
  MealInput,
  MealListFilters,
  MealListResult,
  MealSummary,
  MealReport,
  MealSummaryFilters,
  PdfImportPreview,
} from "@/lib/types/api";

export function listMeals(filters: MealListFilters = {}) {
  const page =
    filters.page != null
      ? Math.max(1, filters.page)
      : undefined;

  return apiFetch<{ success: true } & MealListResult>("/meals", {
    query: {
      page,
      limit: filters.limit,
      mealType: filters.mealType,
      startDate: filters.startDate,
      endDate: filters.endDate,
    },
  });
}

export function getMealSummary(filters: MealSummaryFilters = {}) {
  return apiFetch<{ success: true; summary: MealSummary }>("/meals/summary", {
    query: {
      mealType: filters.mealType,
      startDate: filters.startDate,
      endDate: filters.endDate,
      tzOffset: new Date().getTimezoneOffset(),
    },
  });
}

export function createMeal(payload: MealInput) {
  return apiFetch<{ success: true; meal: MealEntry }>("/meals", {
    method: "POST",
    body: payload,
  });
}

export function updateMeal(id: string, payload: Partial<MealInput>) {
  return apiFetch<{ success: true; meal: MealEntry }>(`/meals/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteMeal(id: string) {
  return apiFetch<{ success: true; message: string }>(`/meals/${id}`, {
    method: "DELETE",
  });
}

/** All report datasets for a date range, computed from every meal in it. */
export function getMealReport(filters: Pick<MealSummaryFilters, "startDate" | "endDate">) {
  return apiFetch<{ success: true; report: MealReport }>("/meals/report", {
    query: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      tzOffset: new Date().getTimezoneOffset(),
    },
  });
}

/** Stores a meal photo and returns the URL to save as the meal's attachment. */
export function uploadMealPhoto(payload: { imageBase64: string }) {
  return apiFetch<{
    success: true;
    attachmentUrl: string;
    attachmentType: "IMAGE";
  }>("/meals/photo", {
    method: "POST",
    body: payload,
  });
}

/** Parses a diary PDF into meal drafts for review. Nothing is saved. */
export function previewPdfImport(payload: { pdfBase64: string }) {
  return apiFetch<{ success: true } & PdfImportPreview>("/meals/import-pdf/preview", {
    method: "POST",
    body: payload,
  });
}

/** Saves several meals (with their items) in one request. */
export function createMealsBulk(meals: MealInput[]) {
  return apiFetch<{ success: true; count: number; itemCount: number }>("/meals/bulk", {
    method: "POST",
    body: { meals },
  });
}
