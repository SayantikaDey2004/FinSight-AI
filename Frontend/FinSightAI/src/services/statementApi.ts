import { ApiError, getStoredAccessToken, type StatementAnalysisResponse } from "./authApi";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export async function uploadStatement(file: File): Promise<StatementAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getStoredAccessToken();

  const response = await fetch(`${API_BASE_URL}/statements/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
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
        ? String((data as { detail?: unknown }).detail ?? "Upload failed")
        : typeof data === "string" && data.trim()
          ? data
          : "Upload failed";
    throw new ApiError(detail, response.status);
  }

  return data as StatementAnalysisResponse;
}