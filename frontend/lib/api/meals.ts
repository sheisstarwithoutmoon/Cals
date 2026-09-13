import { apiFetch } from "@/lib/api/client";
import type {
  MealEntry,
  MealInput,
  MealListFilters,
  MealListResult,
} from "@/lib/types/api";

export function listMeals(filters: MealListFilters = {}) {
  return apiFetch<{ success: true } & MealListResult>("/meals", {
    query: {
      page: filters.page,
      limit: filters.limit,
      mealType: filters.mealType,
      startDate: filters.startDate,
      endDate: filters.endDate,
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

export function importMealsFromPdf(payload: { pdfBase64: string }) {
  return apiFetch<{
    success: true;
    message: string;
    count: number;
    sampleEntries: Partial<MealEntry>[];
  }>("/meals/import-pdf", {
    method: "POST",
    body: payload,
  });
}
