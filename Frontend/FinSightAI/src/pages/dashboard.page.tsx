import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  ApiError,
  clearAuthSession,
  fetchCurrentUser,
  getStoredAccessToken,
  getStoredUser,
  logout as logoutRequest,
  type AuthUser,
  type StatementAnalysisResponse,
} from "../services/authApi";
import { getDashboardSummary, type DashboardSummaryResponse } from "../services/dashboardApi";

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

interface MetricProps {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

const EMPTY_SUMMARY: DashboardSummaryResponse = {
  healthScore: 0,
  totalIncome: 0,
  totalExpense: 0,
  currentBalance: 0,
  savings: 0,
  incomeChangePct: 0,
  expenseChangePct: 0,
  savingsPct: 0,
  transactionCount: 0,
  monthlyData: [],
  categories: [],
  recurring: [],
  unusual: [],
  aiInsights: [],
  txList: [],
};

function money(value: number) {
  return `₹${Math.abs(value).toLocaleString("en-IN")}`;
}

function percent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}%`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FS";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "FS";
}

function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <section
      style={{
        background: "rgba(8, 13, 28, 0.92)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 800 }}>{title}</div>
          {subtitle && <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, hint, accent }: MetricProps) {
  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(12,18,36,0.96), rgba(8,12,24,0.94))",
        border: "1px solid rgba(148,163,184,0.12)",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.26)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: "0 auto auto 0", height: 4, width: "100%", background: accent }} />
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "#7dd3fc", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 30, marginTop: 10, letterSpacing: "-0.04em", fontWeight: 800, color: "#f8fafc" }}>{value}</div>
      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{hint}</div>
    </div>
  );
}

function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}2a`,
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [summary, setSummary] = useState<DashboardSummaryResponse>(EMPTY_SUMMARY);
  const [analysis, setAnalysis] = useState<StatementAnalysisResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const token = getStoredAccessToken();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const [profile, dashboard] = await Promise.all([fetchCurrentUser(), getDashboardSummary(token)]);
        if (!active) return;
        setUser(profile);
        setSummary(dashboard);
      } catch (requestError) {
        if (!active) return;

        if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a statement file first.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      setError("Statement uploads are not wired in this backend build yet.");
      setAnalysis(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    setLogoutBusy(true);
    try {
      await logoutRequest();
    } finally {
      setLogoutBusy(false);
      navigate("/login", { replace: true });
    }
  }

  const displayName = user?.name || user?.email || "FinSight user";
  const avatar = useMemo(() => initials(displayName), [displayName]);
  const topSummary = summary;
  const healthStatus = topSummary.healthScore >= 700 ? "Excellent" : topSummary.healthScore >= 500 ? "Healthy" : topSummary.healthScore >= 300 ? "Watch" : "Needs attention";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)",
        color: "#e2e8f0",
      }}
    >
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(16px)",
          background: "rgba(4,8,20,0.72)",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>FinSightAI</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Financial dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{displayName}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{user?.email || "Signed in"}</div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                color: "white",
                fontWeight: 800,
                boxShadow: "0 10px 24px rgba(14,165,233,0.25)",
              }}
            >
              {avatar}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutBusy}
              style={{
                border: "1px solid rgba(148,163,184,0.16)",
                borderRadius: 14,
                padding: "10px 14px",
                background: "rgba(15,23,42,0.85)",
                color: "#e2e8f0",
                cursor: logoutBusy ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {logoutBusy ? "Signing out…" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 56px" }}>
        {error && (
          <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fecaca" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 20 }}>
          <MetricCard label="Health score" value={loading ? "…" : `${topSummary.healthScore}/850`} hint={healthStatus} accent="linear-gradient(90deg, #0ea5e9, #22c55e)" />
          <MetricCard label="Income" value={loading ? "…" : money(topSummary.totalIncome)} hint={loading ? "Loading summary" : `${percent(topSummary.incomeChangePct)} vs prior period`} accent="linear-gradient(90deg, #22c55e, #86efac)" />
          <MetricCard label="Expense" value={loading ? "…" : money(topSummary.totalExpense)} hint={loading ? "Loading summary" : `${percent(topSummary.expenseChangePct)} vs prior period`} accent="linear-gradient(90deg, #f97316, #fca5a5)" />
          <MetricCard label="Savings" value={loading ? "…" : money(topSummary.savings)} hint={loading ? "Loading summary" : `${topSummary.savingsPct}% of income saved`} accent="linear-gradient(90deg, #8b5cf6, #c4b5fd)" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 16, marginBottom: 16 }}>
          <Section title="Monthly trend" subtitle="Income and spending across recent months">
            <div style={{ display: "grid", gap: 12 }}>
              {topSummary.monthlyData.length > 0 ? topSummary.monthlyData.map((item) => {
                const total = Math.max(item.income + item.expense, 1);
                const incomeWidth = `${Math.min((item.income / total) * 100, 100)}%`;
                const expenseWidth = `${Math.min((item.expense / total) * 100, 100)}%`;
                return (
                  <div key={item.month} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <strong>{item.month}</strong>
                      <span style={{ color: "#94a3b8" }}>{money(item.income)} in / {money(item.expense)} out</span>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: incomeWidth, height: "100%", background: "linear-gradient(90deg, #86efac, #22c55e)" }} />
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: expenseWidth, height: "100%", background: "linear-gradient(90deg, #fca5a5, #ef4444)" }} />
                      </div>
                    </div>
                  </div>
                );
              }) : <div style={{ color: "#94a3b8" }}>No monthly data yet.</div>}
            </div>
          </Section>

          <Section title="Account snapshot" subtitle="Live summary from the backend" action={<Badge color="#0ea5e9">{topSummary.transactionCount} transactions</Badge>}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", color: "#7dd3fc", fontWeight: 800 }}>Current balance</div>
                <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>{money(topSummary.currentBalance)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", color: "#7dd3fc", fontWeight: 800 }}>Savings rate</div>
                <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>{topSummary.savingsPct}%</div>
              </div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.14)",
                  background: "rgba(15,23,42,0.85)",
                  color: "#e2e8f0",
                  fontWeight: 700,
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Uploading…" : "Upload statement"}
              </button>
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                style={{ width: "100%", color: "#94a3b8" }}
              />
              {selectedFile && <div style={{ fontSize: 13, color: "#94a3b8" }}>Selected: {selectedFile.name}</div>}
            </div>
          </Section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Section title="Categories" subtitle="Spending distribution by category">
            <div style={{ display: "grid", gap: 12 }}>
              {topSummary.categories.length > 0 ? topSummary.categories.map((category) => (
                <div key={category.name} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{category.name}</span>
                    <span style={{ color: category.color }}>{money(category.amount)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${category.pct}%`, height: "100%", background: category.color }} />
                  </div>
                </div>
              )) : <div style={{ color: "#94a3b8" }}>No category data yet.</div>}
            </div>
          </Section>

          <Section title="Recurring payments" subtitle="Subscriptions and scheduled bills">
            <div style={{ display: "grid", gap: 10 }}>
              {topSummary.recurring.length > 0 ? topSummary.recurring.map((item) => (
                <div key={item.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{item.date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#fca5a5" }}>-{money(item.amount)}</div>
                    <div style={{ marginTop: 6 }}><Badge color={item.status === "active" ? "#22c55e" : item.status === "due" ? "#f59e0b" : "#ef4444"}>{item.status}</Badge></div>
                  </div>
                </div>
              )) : <div style={{ color: "#94a3b8" }}>No recurring payments detected yet.</div>}
            </div>
          </Section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Section title="Unusual transactions" subtitle="Flagged by the backend AI layer">
            <div style={{ display: "grid", gap: 10 }}>
              {topSummary.unusual.length > 0 ? topSummary.unusual.map((item) => (
                <div key={item.name} style={{ padding: 12, borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#f8fafc" }}>{item.name}</div>
                      <div style={{ marginTop: 4, color: "#fca5a5", fontSize: 13 }}>{item.reason}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#fca5a5" }}>-{money(item.amount)}</div>
                  </div>
                </div>
              )) : <div style={{ color: "#94a3b8" }}>No anomalies detected yet.</div>}
            </div>
          </Section>

          <Section title="AI summary" subtitle="Insights generated from your statement">
            <div style={{ display: "grid", gap: 12 }}>
              {topSummary.aiInsights.length > 0 ? topSummary.aiInsights.map((item) => (
                <div key={item.title} style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                  <div style={{ fontSize: 20 }}>{item.icon}</div>
                  <div style={{ marginTop: 8, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7dd3fc", fontWeight: 800 }}>{item.title}</div>
                  <div style={{ marginTop: 8, color: "#e2e8f0", lineHeight: 1.6 }}>{item.text}</div>
                </div>
              )) : <div style={{ color: "#94a3b8" }}>Upload a statement to generate insights.</div>}
            </div>
          </Section>
        </div>

        <Section title="Transaction history" subtitle="Latest transactions returned by the backend">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Date", "Transaction", "Category", "Amount", "Status"].map((column) => (
                    <th key={column} style={{ textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.14em", borderBottom: "1px solid rgba(148,163,184,0.12)" }}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSummary.txList.length > 0 ? topSummary.txList.map((tx) => (
                  <tr key={`${tx.date}-${tx.name}`} style={{ borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                    <td style={{ padding: "14px 10px", color: "#94a3b8" }}>{tx.date}</td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ fontWeight: 700 }}>{tx.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{tx.bank}</div>
                    </td>
                    <td style={{ padding: "14px 10px" }}><Badge color={tx.catColor}>{tx.cat}</Badge></td>
                    <td style={{ padding: "14px 10px", fontWeight: 800, color: tx.amount >= 0 ? "#22c55e" : "#fca5a5" }}>{tx.amount >= 0 ? "+" : "-"}{money(tx.amount)}</td>
                    <td style={{ padding: "14px 10px" }}><Badge color={tx.status === "completed" ? "#22c55e" : tx.status === "pending" ? "#f59e0b" : "#ef4444"}>{tx.status}</Badge></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 20, color: "#94a3b8" }}>No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {analysis && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid rgba(34,197,94,0.18)", background: "rgba(34,197,94,0.06)", color: "#dcfce7" }}>
            Statement upload response received: {analysis.summary?.top_spending_category || "analysis loaded"}
          </div>
        )}
      </main>
    </div>
  );
}