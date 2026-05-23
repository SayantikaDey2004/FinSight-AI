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

export interface ProfileUpdatePayload {
  name: string;
  email: string;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
  reset_token?: string;
  reset_url?: string;
}

export interface StatementTransaction {
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  category: string;
  type: string;
}

export interface StatementRecurringItem {
  name: string;
  count: number;
  avg_amount: number;
  category: string;
}

export interface StatementSummary {
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  top_spending_category: string;
  transaction_count: number;
  category_breakdown: Record<string, number>;
}

export interface StatementAiSummary {
  overview: string;
  observations: string[];
  recommendations: string[];
  health_score: number;
  health_score_reason: string;
}

export interface StatementMonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

export interface StatementAnalysisResponse {
  summary: StatementSummary;
  transactions: StatementTransaction[];
  recurring: StatementRecurringItem[];
  unusual: StatementTransaction[];
  ai_summary: StatementAiSummary;
  monthly_trend: StatementMonthlyTrendItem[];
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

const ACCESS_TOKEN_KEY = "finsight_access_token";
const REFRESH_TOKEN_KEY = "finsight_refresh_token";
const USER_KEY = "finsight_user";

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

function readStoredValue(key: string): string | null {
  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
}

function writeStoredValue(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

export function getStoredAccessToken() {
  return readStoredValue(ACCESS_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = readStoredValue(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  writeStoredValue(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

async function requestAuthorizedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
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
  storage.setItem(ACCESS_TOKEN_KEY, auth.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, auth.refresh_token);
  storage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export async function fetchCurrentUser() {
  return requestAuthorizedJson<AuthUser>("/auth/me", {
    method: "GET",
  });
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  return requestAuthorizedJson<AuthUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  try {
    await requestAuthorizedJson<MessageResponse>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearAuthSession();
  }
}
