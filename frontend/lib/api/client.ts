import type { ZodIssue } from "@/lib/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, issues?: ZodIssue[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = {};

    for (const issue of issues ?? []) {
      const key = issue.path?.[0];
      if (typeof key === "string" && !this.fieldErrors[key]) {
        this.fieldErrors[key] = issue.message;
      }
    }
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Every request is sent with `credentials: "include"` so the browser
 * attaches the backend's HTTP-only `auth_token` cookie. The token is
 * never read or stored by frontend JavaScript.
 */
function sanitizeErrorMessage(message: string, status: number): string {
  if (status >= 500) {
    return "Unable to connect to the service. Please try again in a moment.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a few minutes and try again.";
  }

  const lower = message.toLowerCase();
  const hasLeak = [
    "prisma",
    "invocation",
    "database",
    "neon.tech",
    "postgres",
    "findunique",
    "findmany",
    "can't reach",
    "error:",
    "stack",
    "\\src\\",
    "/src/",
  ].some((term) => lower.includes(term));

  if (hasLeak) {
    return "Unable to complete request right now. Please try again later.";
  }

  return message;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, query }: RequestOptions = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      0
    );
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const rawMessage = data?.message ?? "Something went wrong. Please try again.";
    const safeMessage = sanitizeErrorMessage(rawMessage, response.status);

    throw new ApiError(
      safeMessage,
      response.status,
      data?.errors
    );
  }

  return data as T;
}
