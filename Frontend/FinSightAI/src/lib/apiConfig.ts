const backendUrl =
	((import.meta.env.BACKEND_URL as string | undefined) || (import.meta.env.VITE_API_URL as string | undefined) || "https://codeflow2026-thinkq-finsightai.onrender.com")
		.replace(/\/$/, "");

export const API_BASE_URL = backendUrl.endsWith("/api/v1") ? backendUrl : `${backendUrl}/api/v1`;