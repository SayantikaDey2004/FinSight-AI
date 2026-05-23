export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail?: unknown }).detail ?? "Request failed")
        : typeof data === "string" && data.trim()
          ? data
          : "Request failed";
    throw new ApiError(detail, response.status);
  }

  return data as T;
}

export async function signup(payload: { name: string; email: string; password: string }) {
  return requestJson<TokenResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return requestJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(payload: { email: string }) {
  return requestJson<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: { token: string; new_password: string }) {
  return requestJson<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function persistAuthSession(auth: TokenResponse, rememberMe = true) {
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem("finsight_access_token", auth.access_token);
  storage.setItem("finsight_refresh_token", auth.refresh_token);
  storage.setItem("finsight_user", JSON.stringify(auth.user));
}
