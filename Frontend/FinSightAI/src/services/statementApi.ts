import { ApiError, getStoredAccessToken, getStoredAccessTokenCandidates } from "./authApi";
import type { TransactionRecord, TransactionSummary } from "../lib/transactionStore";
import { API_BASE_URL } from "../lib/apiConfig";

export interface UploadedStatementFile {
  name: string;
  size: number;
  type: string;
}

export interface StatementRecurringItem {
  name: string;
  count: number;
  avg_amount: number;
  category: string;
}

export interface StatementAiSummary {
  overview: string;
  observations: string[];
  recommendations: string[];
  health_score: number;
  health_score_reason: string;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

export interface BackendStatementAnalysisResponse {
  uploaded_at: string;
  files: UploadedStatementFile[];
  summary: TransactionSummary & {
    total_income: number;
    total_expense: number;
    net_savings: number;
    savings_rate: number;
    top_spending_category: string;
    transaction_count: number;
    category_breakdown: Record<string, number>;
  };
  transactions: TransactionRecord[];
  recurring: StatementRecurringItem[];
  unusual: TransactionRecord[];
  ai_summary: StatementAiSummary;
  monthly_trend: MonthlyTrendItem[];
}

async function requestBackend<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = getStoredAccessTokenCandidates();
  const fallbackToken = getStoredAccessToken();
  const tokenList = fallbackToken && !tokens.includes(fallbackToken) ? [fallbackToken, ...tokens] : tokens;

  let lastError: ApiError | null = null;

  for (const token of tokenList) {
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

    if (response.ok) {
      return data as T;
    }

    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail?: unknown }).detail ?? "Request failed")
        : typeof data === "string" && data.trim()
          ? data
          : "Request failed";
    lastError = new ApiError(detail, response.status);

    if (response.status !== 401 && response.status !== 403) {
      throw lastError;
    }
  }

  throw lastError ?? new ApiError("Request failed", 500);
}

export async function uploadStatementFiles(files: File[]): Promise<BackendStatementAnalysisResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const tokens = getStoredAccessTokenCandidates();
  const fallbackToken = getStoredAccessToken();
  const tokenList = fallbackToken && !tokens.includes(fallbackToken) ? [fallbackToken, ...tokens] : tokens;

  let lastError: ApiError | null = null;

  for (const token of tokenList) {
    const res = await fetch(`${API_BASE_URL}/statements/upload`, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text;
      }
    }

    if (res.ok) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finsight:statement-updated", { detail: data }));
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("finsight:statement-updated");
          channel.postMessage({ type: "statement-updated" });
          channel.close();
        }
      }

      return data as BackendStatementAnalysisResponse;
    }

    const detail = typeof data === "object" && data !== null && "detail" in data ? String((data as { detail?: unknown }).detail ?? "Request failed") : typeof data === "string" && data.trim() ? data : "Request failed";
    lastError = new ApiError(detail, res.status);

    if (res.status !== 401 && res.status !== 403) {
      throw lastError;
    }
  }

  throw lastError ?? new ApiError("Request failed", 500);
}

export async function uploadStatement(file: File): Promise<BackendStatementAnalysisResponse> {
  return uploadStatementFiles([file]);
}

export async function fetchLatestStatementAnalysis(): Promise<BackendStatementAnalysisResponse | null> {
  try {
    return await requestBackend<BackendStatementAnalysisResponse>("/statements/latest", {
      method: "GET",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
