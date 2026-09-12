import { apiFetch } from "@/lib/api/client";
import type { Goal, GoalInput } from "@/lib/types/api";

export function getGoal() {
  return apiFetch<{ success: true; goal: Goal }>("/goals");
}

export function saveGoal(payload: GoalInput) {
  return apiFetch<{ success: true; goal: Goal }>("/goals", {
    method: "POST",
    body: payload,
  });
}
