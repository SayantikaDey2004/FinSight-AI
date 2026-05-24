import { ApiError, getStoredAccessTokenCandidates } from "./authApi";
import { API_BASE_URL } from "../lib/apiConfig";

export interface DashboardSummaryResponse {
  healthScore: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  savings: number;
  incomeChangePct: number;
  expenseChangePct: number;
  savingsPct: number;
  transactionCount: number;
  monthlyData: Array<{ month: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; pct: number; color: string }>;
  recurring: Array<{
    name: string;
    date: string;
    amount: number;
    status: "active" | "due" | "missed";
    icon: string;
    color: string;
    category: string;
    count: number;
    avg_amount: number;
    cadence_months: number;
    next_due_date: string | null;
    unusual: boolean;
  }>;
  unusual: Array<{ name: string; reason: string; amount: number; icon: string }>;
  aiInsights: Array<{ icon: string; title: string; text: string }>;
  txList: Array<{
    date: string;
    name: string;
    bank: string;
    cat: string;
    catColor: string;
    icon: string;
    iconBg: string;
    amount: number;
    status: "completed" | "pending" | "flagged";
  }>;
}

async function requestJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

export function getDashboardSummary(token: string) {
  return requestJson<DashboardSummaryResponse>("/dashboard/summary", token).catch(async (error) => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      for (const candidate of getStoredAccessTokenCandidates()) {
        if (candidate === token) {
          continue;
        }

        try {
          return await requestJson<DashboardSummaryResponse>("/dashboard/summary", candidate);
        } catch (candidateError) {
          if (candidateError instanceof ApiError && (candidateError.status === 401 || candidateError.status === 403)) {
            continue;
          }
          throw candidateError;
        }
      }
    }

    throw error;
  });
}