import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  ApiError,
  clearAuthSession,
  fetchCurrentUser,
  getStoredAccessToken,
} from "../services/authApi";
import { getDashboardSummary, type DashboardSummaryResponse } from "../services/dashboardApi";
import FinSightSidebar from "../components/ui/FinSightSidebar";

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
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

export default function UnusualSpendingPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryResponse>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    const handleStatementUpdated = () => {
      setRefreshSeed((value) => value + 1);
    };

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("finsight:statement-updated") : null;
    const handleBroadcastMessage = () => {
      setRefreshSeed((value) => value + 1);
    };

    window.addEventListener("finsight:statement-updated", handleStatementUpdated);
    channel?.addEventListener("message", handleBroadcastMessage);

    return () => {
      window.removeEventListener("finsight:statement-updated", handleStatementUpdated);
      channel?.removeEventListener("message", handleBroadcastMessage);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const token = getStoredAccessToken();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const [, dashboard] = await Promise.all([fetchCurrentUser(), getDashboardSummary(token)]);
        if (!active) return;
        setSummary(dashboard);
      } catch (requestError) {
        if (!active) return;

        if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to load unusual spending analysis.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [navigate, refreshSeed]);

  const topSpendingCategory = summary.categories[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)",
        color: "#e2e8f0",
      }}
    >
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
      <FinSightSidebar />

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
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Unusual spending</div>
          </div>
          <div />
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 56px" }}>
        {error && (
          <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fecaca" }}>
            {error}
          </div>
        )}

        <Section
          title="Unusual spending"
          subtitle="Gemini-backed review of your transaction history for unusual patterns"
          action={<Badge color="#ef4444">{loading ? "…" : `${summary.unusual.length} flagged`}</Badge>}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7dd3fc", fontWeight: 800 }}>Pattern review</div>
              <div style={{ marginTop: 10, color: "#e2e8f0", lineHeight: 1.7 }}>
                The backend checks your uploaded transaction history and highlights spending that looks unusual. If Gemini or the backend analyzer finds a risky pattern, it will appear below.
              </div>
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Badge color="#0ea5e9">{summary.transactionCount} transactions</Badge>
                <Badge color="#f59e0b">{topSpendingCategory ? `${topSpendingCategory.name} leads spending` : "No category data"}</Badge>
                <Badge color={summary.unusual.length > 0 ? "#ef4444" : "#22c55e"}>{summary.unusual.length > 0 ? "Review needed" : "No unusual pattern detected"}</Badge>
              </div>
            </div>

            {summary.unusual.length > 0 ? (
              summary.unusual.map((item) => (
                <div key={item.name} style={{ padding: 16, borderRadius: 16, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: 16 }}>{item.name}</div>
                      <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 13, lineHeight: 1.6 }}>{item.reason}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: "#fca5a5", fontSize: 18 }}>-{money(item.amount)}</div>
                      <div style={{ marginTop: 6 }}><Badge color="#f59e0b">Flagged</Badge></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.16)", color: "#dcfce7" }}>
                No unusual spending pattern detected from the current transaction history.
              </div>
            )}
          </div>
        </Section>
      </main>
    </div>
  );
}
