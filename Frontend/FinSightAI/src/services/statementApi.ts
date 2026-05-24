import { ApiError, getStoredAccessToken } from "./authApi";
import type { TransactionRecord, TransactionSummary } from "../lib/transactionStore";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

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

export async function uploadStatementFiles(files: File[]): Promise<BackendStatementAnalysisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const token = getStoredAccessToken();
  try {
    const res = await fetch(`${API_BASE_URL}/statements/upload`, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout as unknown as number);

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const detail = typeof data === "object" && data !== null && "detail" in data ? String((data as any).detail ?? "Request failed") : typeof data === "string" && data.trim() ? data : "Request failed";
      throw new ApiError(detail, res.status);
    }

    return data as BackendStatementAnalysisResponse;
  } catch (err) {
    clearTimeout(timeout as unknown as number);
    // Fallback: try per-file analyze then save merged result
    const analyses: BackendStatementAnalysisResponse[] = [];
    for (const file of files) {
      const singleForm = new FormData();
      singleForm.append("file", file);
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch(`${API_BASE_URL}/statements/analyze`, {
          method: "POST",
          body: singleForm,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ctrl.signal,
        });
        clearTimeout(to as unknown as number);
        const txt = await r.text();
        const parsed = txt ? JSON.parse(txt) : null;
        if (r.ok && parsed) {
          analyses.push(parsed as BackendStatementAnalysisResponse);
        }
      } catch (e) {
        // ignore single-file failure
      }
    }

    if (analyses.length === 0) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("Upload failed or timed out", 0);
    }

    // Merge analyses
    const mergedFiles: UploadedStatementFile[] = analyses.flatMap((a) => a.files || []);
    const mergedTx = analyses.flatMap((a) => a.transactions || []);
    const mergedRecurring = analyses.flatMap((a) => a.recurring || []);
    const mergedUnusual = analyses.flatMap((a) => a.unusual || []);

    // Compute simple summary from transactions
    let totalIncome = 0;
    let totalExpense = 0;
    const category_breakdown: Record<string, number> = {};
    for (const t of mergedTx) {
      const amt = t.amount ?? 0;
      if (amt > 0) totalIncome += amt;
      else totalExpense += Math.abs(amt);
      if (t.type === "debit") {
        category_breakdown[t.category] = (category_breakdown[t.category] || 0) + (t.debit || Math.abs(amt) || 0);
      }
    }
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const sortedCats = Object.entries(category_breakdown).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats.length ? sortedCats[0][0] : "N/A";

    const mergedSummary = {
      total_income: Math.round(totalIncome),
      total_expense: Math.round(totalExpense),
      net_savings: Math.round(netSavings),
      savings_rate: savingsRate,
      top_spending_category: topCategory,
      transaction_count: mergedTx.length,
      category_breakdown,
    };

    const payload = {
      uploaded_at: new Date().toISOString(),
      files: mergedFiles,
      summary: mergedSummary,
      transactions: mergedTx,
      recurring: mergedRecurring,
      unusual: mergedUnusual,
      ai_summary: {},
      monthly_trend: [],
    } as BackendStatementAnalysisResponse & { uploaded_at: string };

    // Save merged payload on server
    const saveRes = await requestBackend<BackendStatementAnalysisResponse>("/statements/save", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return saveRes;
  }
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
