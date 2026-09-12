import { API_BASE_URL, apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/types/api";

export const googleAuthUrl = `${API_BASE_URL}/auth/google`;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function register(payload: RegisterPayload) {
  return apiFetch<{ success: true; user: User }>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return apiFetch<{ success: true; user: User }>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function logout() {
  return apiFetch<{ success: true; message: string }>("/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return apiFetch<{ success: true; user: User }>("/auth/me");
}
