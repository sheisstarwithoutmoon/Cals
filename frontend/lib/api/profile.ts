import { apiFetch } from "@/lib/api/client";
import type { ProfileUpdate, ProfileView } from "@/lib/types/api";

export function getProfile() {
  return apiFetch<{ success: true } & ProfileView>("/profile");
}

/**
 * Partially updates body stats, health conditions and/or the weight goal.
 * `adjustments` explains any goal changes the server made for safety.
 */
export function updateProfile(patch: ProfileUpdate) {
  return apiFetch<{ success: true; adjustments: string[] } & ProfileView>("/profile", {
    method: "PUT",
    body: patch,
  });
}
