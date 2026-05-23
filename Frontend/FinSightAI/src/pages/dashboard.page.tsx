import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, clearAuthSession, fetchCurrentUser, getStoredUser, logout as logoutRequest, type AuthUser, type StatementAnalysisResponse } from "../services/authApi";
import { uploadStatement } from "../services/statementApi";

function Card({ children }: { children: ReactNode }) {
  return <div style={{ background: "linear-gradient(160deg, rgba(12,18,36,0.96), rgba(8,12,24,0.94))", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.26)" }}>{children}</div>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "#7dd3fc", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 28, marginTop: 12, letterSpacing: "-0.04em", fontWeight: 800 }}>{value}</div>
        {hint && <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{hint}</div>}
      </div>
    </Card>
  );
}

function initialsFromName(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase() || "").slice(0, 2).join("") || "?";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const cachedUser = getStoredUser();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [analysis, setAnalysis] = useState<StatementAnalysisResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const currentUser = await fetchCurrentUser();
        if (!active) {
          return;
        }

        setUser(currentUser);
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
      } finally {
        if (active) {
          setLoadingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [navigate]);

  const avatar = useMemo(() => initialsFromName(user?.name || "FinSight"), [user?.name]);
  const summary = analysis?.summary;
  const healthScore = analysis?.ai_summary?.health_score ?? 0;
  const savingsRate = summary?.savings_rate ?? 0;
  const topCategory = summary?.top_spending_category || "N/A";

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a PDF or CSV file first.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadStatement(selectedFile);
      setAnalysis(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to analyze the uploaded statement.");
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

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)", color: "#e2e8f0" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(16px)", background: "rgba(4,8,20,0.72)", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>StatementIQ</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/profile")} style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", cursor: "pointer", fontWeight: 700 }}>Profile</button>
            <button onClick={handleLogout} disabled={logoutBusy} style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(248,113,113,0.22)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", cursor: logoutBusy ? "not-allowed" : "pointer", fontWeight: 700 }}>{logoutBusy ? "Signing out..." : "Logout"}</button>
            <div style={{ width: 38, height: 38, borderRadius: 14, background: "linear-gradient(135deg, #38bdf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{avatar}</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 48px" }}>
        <Card>
          <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>Welcome back</div>
              <h1 style={{ margin: "10px 0 6px", fontSize: 34, letterSpacing: "-0.05em", lineHeight: 1.05 }}>{loadingUser ? "Loading dashboard..." : user?.name || "FinSight user"}</h1>
              <p style={{ margin: 0, color: "#94a3b8" }}>{user?.email || "Connect your account to start analyzing statements."}</p>
            </div>
            <div style={{ minWidth: 280, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ fontSize: 12, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>Upload statement</div>
              <input type="file" accept=".pdf,.csv" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} style={{ display: "block", marginTop: 12, color: "#cbd5e1", width: "100%" }} />
              <button onClick={handleUpload} disabled={uploading || !selectedFile} style={{ marginTop: 12, width: "100%", padding: "12px 16px", borderRadius: 14, border: "none", background: uploading || !selectedFile ? "rgba(56,189,248,0.45)" : "linear-gradient(135deg, #38bdf8, #6366f1)", color: "#fff", fontWeight: 800, cursor: uploading || !selectedFile ? "not-allowed" : "pointer" }}>{uploading ? "Analyzing..." : "Analyze statement"}</button>
            </div>
          </div>
        </Card>

        {error && <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.18)", color: "#fca5a5" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginTop: 18 }}>
          <Metric label="Income" value={summary ? `₹${summary.total_income.toLocaleString()}` : "--"} hint="From uploaded statement" />
          <Metric label="Expense" value={summary ? `₹${summary.total_expense.toLocaleString()}` : "--"} hint="Total debits analyzed" />
          <Metric label="Savings rate" value={summary ? `${savingsRate}%` : "--"} hint="Net savings / income" />
          <Metric label="Health score" value={analysis ? `${healthScore}/100` : "--"} hint={topCategory !== "N/A" ? `Top spend: ${topCategory}` : "Analyze a file to populate this"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18, marginTop: 18 }}>
          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>AI summary</div>
              {analysis?.ai_summary ? (
                <>
                  <p style={{ color: "#cbd5e1", lineHeight: 1.7, marginTop: 14 }}>{analysis.ai_summary.overview}</p>
                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    {analysis.ai_summary.observations.slice(0, 4).map((item) => <div key={item} style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)", color: "#e2e8f0" }}>{item}</div>)}
                  </div>
                </>
              ) : (
                <p style={{ color: "#94a3b8", marginTop: 14 }}>Upload a PDF or CSV statement to populate the dashboard with real analytics.</p>
              )}
            </div>
          </Card>

          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>Quick insights</div>
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8" }}>Transaction count</span><strong>{summary?.transaction_count ?? 0}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8" }}>Top category</span><strong>{topCategory}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8" }}>Recurring items</span><strong>{analysis?.recurring?.length ?? 0}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#94a3b8" }}>Unusual debits</span><strong>{analysis?.unusual?.length ?? 0}</strong></div>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>Recurring payments</div>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {analysis?.recurring?.length ? analysis.recurring.slice(0, 6).map((item) => (
                  <div key={`${item.name}-${item.count}`} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>{item.category}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800 }}>x{item.count}</div>
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>₹{item.avg_amount.toLocaleString()}</div>
                    </div>
                  </div>
                )) : <p style={{ color: "#94a3b8" }}>No recurring transactions detected yet.</p>}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>Latest transactions</div>
              <div style={{ display: "grid", gap: 10, marginTop: 16, maxHeight: 420, overflow: "auto" }}>
                {analysis?.transactions?.length ? analysis.transactions.slice(0, 8).map((item) => (
                  <div key={`${item.date}-${item.narration}`} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{item.narration}</strong>
                      <span style={{ color: item.credit > 0 ? "#86efac" : "#fca5a5" }}>{item.credit > 0 ? "+" : "-"}₹{(item.credit > 0 ? item.credit : item.debit).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>{item.date}</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                )) : <p style={{ color: "#94a3b8" }}>Upload a statement to inspect parsed transactions here.</p>}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>Category breakdown</div>
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {summary ? Object.entries(summary.category_breakdown).slice(0, 8).map(([category, amount]) => {
                  const maxAmount = Math.max(...Object.values(summary.category_breakdown), 1);
                  const width = Math.max((amount / maxAmount) * 100, 6);
                  return (
                    <div key={category}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                        <span>{category}</span>
                        <strong>₹{amount.toLocaleString()}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #38bdf8, #6366f1)" }} />
                      </div>
                    </div>
                  );
                }) : <p style={{ color: "#94a3b8" }}>Analyze a file to see spending categories.</p>}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7dd3fc", fontWeight: 700 }}>Monthly trend</div>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {analysis?.monthly_trend?.length ? analysis.monthly_trend.slice(-6).map((item) => (
                  <div key={item.month} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <strong>{item.month}</strong>
                      <span style={{ color: "#94a3b8" }}>Income vs expense</span>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min((item.income / Math.max(item.income + item.expense, 1)) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #86efac, #22c55e)" }} />
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min((item.expense / Math.max(item.income + item.expense, 1)) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #fca5a5, #ef4444)" }} />
                      </div>
                    </div>
                  </div>
                )) : <p style={{ color: "#94a3b8" }}>Monthly trend appears after the first analysis.</p>}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
