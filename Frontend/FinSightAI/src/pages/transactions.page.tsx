import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  CreditCard,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { clearAuthSession, getStoredAccessToken } from "../services/authApi";
import { type UploadedStatementFile } from "../services/statementApi";
import {
  buildTransactionSummary,
  type TransactionRecord,
} from "../lib/transactionStore";
import FinSightSidebar from "../components/ui/FinSightSidebar";

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Food: { icon: CreditCard, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  Transport: { icon: ArrowUpRight, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  Shopping: { icon: Wallet, color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  Utilities: { icon: Sparkles, color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  Health: { icon: Sparkles, color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  Travel: { icon: ArrowUpRight, color: "#06d6a0", bg: "rgba(6,214,160,0.12)" },
  Education: { icon: Sparkles, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Coffee: { icon: CreditCard, color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  Groceries: { icon: CreditCard, color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  Entertainment: { icon: Sparkles, color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
  Rent: { icon: Wallet, color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  Salary: { icon: ArrowDownLeft, color: "#06d6a0", bg: "rgba(6,214,160,0.12)" },
  Freelance: { icon: CreditCard, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  Internet: { icon: Sparkles, color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
};

const SORT_OPTIONS = ["Latest First", "Oldest First", "Highest Amount", "Lowest Amount"] as const;
const TYPE_OPTIONS = ["All", "Credit", "Debit"] as const;

function money(value: number) {
  return `₹${Math.abs(value).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { weekday: "short" });
}

function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${color}18`, border: `1px solid ${color}2a`, color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedStatementFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("All");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Latest First");
  const [onlyUnusual, setOnlyUnusual] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      clearAuthSession();
      navigate("/login", { replace: true });
      return;
    }

    const handleStatementUpdated = () => {
      setRefreshSeed((value) => value + 1);
    };

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("finsight:statement-updated") : null;
    const handleBroadcastMessage = () => {
      setRefreshSeed((value) => value + 1);
    };
    const handleStorageMessage = (event: StorageEvent) => {
      if (event.key === "finsight_access_token" || event.key === "finsight_user") {
        setRefreshSeed((value) => value + 1);
      }
    };

    window.addEventListener("finsight:statement-updated", handleStatementUpdated);
    window.addEventListener("storage", handleStorageMessage);
    channel?.addEventListener("message", handleBroadcastMessage);

    return () => {
      window.removeEventListener("finsight:statement-updated", handleStatementUpdated);
      window.removeEventListener("storage", handleStorageMessage);
      channel?.removeEventListener("message", handleBroadcastMessage);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let pollId: number | undefined;
    let pollAttempts = 0;

    async function requestLatest() {
      const token = getStoredAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("http://localhost:8000/api/v1/statements/latest", {
        cache: "no-store",
        headers: {
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
        throw new Error(detail);
      }

      return data as { files?: UploadedStatementFile[]; transactions?: TransactionRecord[] };
    }

    async function loadTransactionsFromBackend() {
      setRefreshing(true);
      try {
        const latest = await requestLatest();
        if (!mounted) {
          return;
        }

        if (latest?.transactions?.length) {
          setTransactions(latest.transactions);
          setUploadedFiles(latest.files || []);
        } else {
          setTransactions([]);
          setUploadedFiles([]);
        }
      } catch {
        if (!mounted) {
          return;
        }

        setTransactions([]);
        setUploadedFiles([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadTransactionsFromBackend();

    // Keep polling briefly so background OCR results appear automatically after upload.
    pollId = window.setInterval(async () => {
      if (!mounted) return;
      pollAttempts += 1;
      if (pollAttempts > 10) {
        window.clearInterval(pollId);
        return;
      }

      try {
        const latest = await requestLatest();
        if (!mounted) return;
        if (latest?.transactions?.length) {
          setTransactions(latest.transactions);
          setUploadedFiles(latest.files || []);
          setRefreshing(false);
          window.clearInterval(pollId);
        } else if (pollAttempts > 4) {
          setRefreshing(false);
          window.clearInterval(pollId);
        }
      } catch (error) {
        if (error instanceof Error && /(401|403|Not authenticated|Invalid or expired token)/i.test(error.message)) {
          clearAuthSession();
          navigate("/login", { replace: true });
        }
      }
    }, 3000);

    return () => {
      mounted = false;
      if (pollId) {
        window.clearInterval(pollId);
      }
    };
  }, [refreshSeed]);

  const summary = useMemo(() => buildTransactionSummary(transactions), [transactions]);
  const categories = useMemo(() => ["All", ...Object.keys(summary.categoryTotals)], [summary.categoryTotals]);

  const filtered = useMemo(() => {
    let data = [...transactions];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      data = data.filter((item) =>
        item.merchant.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.note.toLowerCase().includes(term),
      );
    }

    if (category !== "All") {
      data = data.filter((item) => item.category === category);
    }

    if (typeFilter !== "All") {
      data = data.filter((item) => item.type === typeFilter.toLowerCase());
    }

    if (onlyUnusual) {
      data = data.filter((item) => item.unusual);
    }

    data.sort((left, right) => {
      switch (sortBy) {
        case "Oldest First":
          return new Date(left.date).getTime() - new Date(right.date).getTime();
        case "Highest Amount":
          return Math.abs(right.amount) - Math.abs(left.amount);
        case "Lowest Amount":
          return Math.abs(left.amount) - Math.abs(right.amount);
        case "Latest First":
        default:
          return new Date(right.date).getTime() - new Date(left.date).getTime();
      }
    });

    return data;
  }, [category, onlyUnusual, search, sortBy, transactions, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, TransactionRecord[]>();
    filtered.forEach((item) => {
      const existing = map.get(item.date) || [];
      map.set(item.date, [...existing, item]);
    });
    return Array.from(map.entries()).sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime());
  }, [filtered]);

  const activeFilters = Number(category !== "All") + Number(typeFilter !== "All") + Number(onlyUnusual);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)", color: "#e2e8f0" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
      <FinSightSidebar />

      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(16px)", background: "rgba(4,8,20,0.72)", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>FinSightAI</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Transaction history</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px 92px" }}>
        <section style={{ background: "linear-gradient(160deg, rgba(12,18,36,0.95), rgba(8,12,24,0.92))", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.26)", padding: 24, marginBottom: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>Uploaded data</div>
              <h1 style={{ marginTop: 10, marginBottom: 6, fontSize: 34, letterSpacing: "-0.05em", lineHeight: 1.08 }}>Transaction <span style={{ color: "#38bdf8" }}>History</span></h1>
              <p style={{ color: "#94a3b8", maxWidth: 720 }}>This page loads the backend OCR result for the latest uploaded statement. If the server is unavailable, it falls back to the last saved upload snapshot only.</p>
              {refreshing && (
                <div style={{ marginTop: 10, color: "#7dd3fc", fontSize: 13 }}>
                  Processing OCR in the background, refreshing results automatically...
                </div>
              )}
            </div>
            <div style={{ minWidth: 240, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ fontSize: 12, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>Uploaded files</div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {uploadedFiles.length ? uploadedFiles.map((file) => (
                  <div key={file.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#cbd5e1" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <span style={{ color: "#94a3b8" }}>{Math.round(file.size / 1024)} KB</span>
                  </div>
                )) : <div style={{ color: "#94a3b8", fontSize: 13 }}>No OCR analysis found yet. Upload a statement to load transaction history.</div>}
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
          <MetricCard title="Income" value={loading ? "…" : money(summary.totalIncome)} hint="From backend OCR" accent="linear-gradient(90deg, #22c55e, #86efac)" />
          <MetricCard title="Expense" value={loading ? "…" : money(summary.totalExpense)} hint="Total debits analyzed" accent="linear-gradient(90deg, #f97316, #fca5a5)" />
          <MetricCard title="Savings" value={loading ? "…" : money(summary.netSavings)} hint={`${summary.savingsRate}% savings rate`} accent="linear-gradient(90deg, #8b5cf6, #c4b5fd)" />
          <MetricCard title="Flagged" value={loading ? "…" : `${summary.unusualCount}`} hint="Unusual debits" accent="linear-gradient(90deg, #0ea5e9, #22d3ee)" />
        </div>

        <section style={{ background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.24)", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 800 }}>Controls</div>
              <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>Search, filter and sort the transaction list.</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Badge color="#38bdf8">{filtered.length} shown</Badge>
              <Badge color="#f59e0b">{activeFilters} filters</Badge>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant, category or note" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 14, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", outline: "none" }} />
              </div>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowSortMenu((value) => !value)} style={{ height: 46, padding: "0 14px", borderRadius: 14, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <SlidersHorizontal size={14} /> Sort <ChevronDown size={14} />
                </button>
                {showSortMenu && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 20, background: "#111c33", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 14, overflow: "hidden", minWidth: 180 }}>
                    {SORT_OPTIONS.map((option) => (
                      <button key={option} onClick={() => { setSortBy(option); setShowSortMenu(false); }} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", color: sortBy === option ? "#93c5fd" : "#cbd5e1", border: "none", cursor: "pointer" }}>{option}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowFilterMenu((value) => !value)} style={{ height: 46, padding: "0 14px", borderRadius: 14, border: `1px solid ${activeFilters ? "rgba(59,130,246,0.35)" : "rgba(148,163,184,0.14)"}`, background: activeFilters ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)", color: activeFilters ? "#93c5fd" : "#e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <Filter size={14} /> Filter {activeFilters ? `(${activeFilters})` : ""}
                </button>
                {showFilterMenu && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 20, background: "#111c33", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 14, padding: 12, minWidth: 220 }}>
                    <div style={{ fontSize: 11, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 800, marginBottom: 8 }}>Type</div>
                    <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                      {TYPE_OPTIONS.map((option) => (
                        <button key={option} onClick={() => setTypeFilter(option)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(148,163,184,0.12)", background: typeFilter === option ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)", color: typeFilter === option ? "#93c5fd" : "#e2e8f0", cursor: "pointer" }}>{option}</button>
                      ))}
                    </div>
                    <button onClick={() => setOnlyUnusual((value) => !value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(148,163,184,0.12)", background: onlyUnusual ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)", color: onlyUnusual ? "#fbbf24" : "#e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <AlertTriangle size={14} /> Unusual only
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {categories.map((item) => (
                <button key={item} onClick={() => setCategory(item)} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.12)", background: category === item ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", color: category === item ? "#93c5fd" : "#cbd5e1", cursor: "pointer", whiteSpace: "nowrap" }}>{item}</button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 18 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24 }}>
              <div style={{ color: "#7dd3fc", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Loading backend OCR results</div>
              <p style={{ color: "#94a3b8" }}>Fetching the latest uploaded statement analysis.</p>
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24 }}>
              <div style={{ color: "#7dd3fc", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No transactions found</div>
              <p style={{ color: "#94a3b8", marginBottom: 16 }}>Try changing your search or filters.</p>
              <button onClick={() => { setSearch(""); setCategory("All"); setTypeFilter("All"); setOnlyUnusual(false); }} style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "white", cursor: "pointer", fontWeight: 700 }}>Reset filters</button>
            </div>
          ) : (
            grouped.map(([date, items]) => (
              <div key={date} style={{ background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24, padding: 18, boxShadow: "0 24px 60px rgba(0,0,0,0.24)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={14} style={{ color: "#94a3b8" }} />
                    <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 700 }}>{formatDate(date)} · {formatDay(date)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{items.length} entries</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((item) => {
                    const meta = CATEGORY_META[item.category] ?? { icon: CreditCard, color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
                    const Icon = meta.icon;
                    return (
                      <button key={item.id} style={{ width: "100%", textAlign: "left", borderRadius: 18, border: "1px solid rgba(148,163,184,0.12)", background: "rgba(255,255,255,0.03)", padding: 14, cursor: "default" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: meta.bg, border: `1px solid ${meta.color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <Icon size={18} style={{ color: meta.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.merchant}</div>
                                <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.note}</div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                  {item.type === "credit" ? <ArrowDownLeft size={14} style={{ color: "#06d6a0" }} /> : <ArrowUpRight size={14} style={{ color: "#f87171" }} />}
                                  <div style={{ fontSize: 15, fontWeight: 800, color: item.type === "credit" ? "#06d6a0" : "#e2e8f0" }}>{item.type === "credit" ? "+" : "-"}{money(item.amount)}</div>
                                </div>
                                <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>{item.category}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, alignItems: "center" }}>
                              <span style={{ color: "#64748b", fontSize: 12 }}>{item.id} · {item.unusual ? "Flagged" : "Completed"}</span>
                              {item.unusual && <span style={{ color: "#fbbf24", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={12} /> Unusual</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

    </div>
  );
}

function MetricCard({ title, value, hint, accent }: { title: string; value: string; hint: string; accent: string }) {
  return (
    <div style={{ background: "linear-gradient(160deg, rgba(12,18,36,0.96), rgba(8,12,24,0.94))", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 20, padding: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.26)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "0 auto auto 0", width: "100%", height: 4, background: accent }} />
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "#7dd3fc", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 30, marginTop: 10, letterSpacing: "-0.04em", fontWeight: 800, color: "#f8fafc" }}>{value}</div>
      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{hint}</div>
    </div>
  );
}
