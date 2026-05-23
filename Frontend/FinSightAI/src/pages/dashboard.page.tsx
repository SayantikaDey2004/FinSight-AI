import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardApi";

/* ── Types ── */
interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface Category {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

interface RecurringPayment {
  name: string;
  date: string;
  amount: number;
  status: "active" | "due" | "missed";
  icon: string;
  color: string;
}

interface UnusualTransaction {
  name: string;
  reason: string;
  amount: number;
  icon: string;
}

interface AIInsight {
  icon: string;
  title: string;
  text: string;
}

interface Transaction {
  date: string;
  name: string;
  bank: string;
  cat: string;
  catColor: string;
  icon: string;
  iconBg: string;
  amount: number;
  status: "completed" | "pending" | "flagged";
}

export interface DashboardData {
  healthScore: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  savings: number;
  incomeChangePct: number;
  expenseChangePct: number;
  savingsPct: number;
  transactionCount: number;
  monthlyData: MonthData[];
  categories: Category[];
  recurring: RecurringPayment[];
  unusual: UnusualTransaction[];
  aiInsights: AIInsight[];
  txList: Transaction[];
}

interface NavItem {
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SummaryCardProps {
  type: "income" | "expense" | "balance" | "savings";
  label: string;
  icon: string;
  trendText: string;
  sub: string;
  value: number;
  loaded: boolean;
}

interface DonutChartProps {
  cats: Category[];
  total: number;
}

interface BarChartProps {
  data: MonthData[];
}

interface RecurringItemProps {
  item: RecurringPayment;
}

interface UnusualItemProps {
  item: UnusualTransaction;
}

interface TxTableProps {
  txList: Transaction[];
}

export interface StatementIQProps {
  data?: DashboardData;
  loading?: boolean;
}

/* ── Empty / zero state ── */
const EMPTY_DATA: DashboardData = {
  healthScore: 0,
  totalIncome: 0,
  totalExpense: 0,
  currentBalance: 0,
  savings: 0,
  incomeChangePct: 0,
  expenseChangePct: 0,
  savingsPct: 0,
  transactionCount: 0,
  monthlyData: [
    { month: "Jan", income: 0, expense: 0 },
    { month: "Feb", income: 0, expense: 0 },
    { month: "Mar", income: 0, expense: 0 },
    { month: "Apr", income: 0, expense: 0 },
    { month: "May", income: 0, expense: 0 },
    { month: "Jun", income: 0, expense: 0 },
  ],
  categories: [],
  recurring: [],
  unusual: [],
  aiInsights: [],
  txList: [],
};

/* ── Helpers ── */
const fmt = (n: number): string => "₹" + Math.abs(n).toLocaleString("en-IN");

function useCountUp(target: number, duration: number = 1200, start: boolean = false): number {
  const [val, setVal] = useState<number>(0);
  useEffect(() => {
    if (!start || target === 0) { setVal(0); return; }
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return val;
}

/* ── Donut SVG ── */
function DonutChart({ cats, total }: DonutChartProps) {
  const cx = 80, cy = 80, r = 65, sw = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  if (cats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 160 160" width="160" height="160">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111c2b" strokeWidth={sw} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-xl text-white" style={{ fontFamily: "Syne, sans-serif" }}>₹0</span>
            <span className="text-xs text-slate-400">Total Spent</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center">No category data yet</p>
      </div>
    );
  }

  const slices = cats.map((c) => {
    const dash = (c.pct / 100) * circ;
    const el = (
      <circle
        key={c.name}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={c.color}
        strokeWidth={sw}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 160 160" width="160" height="160">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111c2b" strokeWidth={sw} />
          {slices}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-xl text-white" style={{ fontFamily: "Syne, sans-serif" }}>{fmt(total)}</span>
          <span className="text-xs text-slate-400">Total Spent</span>
        </div>
      </div>
      <div className="w-full flex flex-col gap-2">
        {cats.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="text-xs text-slate-400 truncate">{c.name}</span>
            </div>
            <div className="flex-1 h-1 rounded-full mx-2 overflow-hidden" style={{ background: "#111c2b" }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${c.pct}%`, background: c.color }} />
            </div>
            <span className="text-xs font-semibold text-white whitespace-nowrap">{fmt(c.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bar Chart ── */
function BarChart({ data }: BarChartProps) {
  const [animated, setAnimated] = useState<boolean>(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 300); }, []);
  const maxVal = Math.max(...data.flatMap((m) => [m.income, m.expense]), 1);

  return (
    <div>
      <div className="flex items-end gap-2 h-40">
        {data.map((m) => {
          const ih = m.income  ? Math.max(6, (m.income  / maxVal) * 130) : 4;
          const eh = m.expense ? Math.max(6, (m.expense / maxVal) * 130) : 4;
          const isEmpty = m.income === 0 && m.expense === 0;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex gap-1 items-end" style={{ height: 140 }}>
                <div
                  title={fmt(m.income)}
                  className="w-4 rounded-t cursor-pointer transition-all duration-700"
                  style={{
                    height: animated ? ih : 4,
                    background: "linear-gradient(180deg,#22d67a,rgba(34,214,122,0.4))",
                    opacity: isEmpty ? 0.15 : 1,
                  }}
                />
                <div
                  title={fmt(m.expense)}
                  className="w-4 rounded-t cursor-pointer transition-all duration-700"
                  style={{
                    height: animated ? eh : 4,
                    background: "linear-gradient(180deg,#f25c5c,rgba(242,92,92,0.4))",
                    opacity: isEmpty ? 0.15 : 1,
                  }}
                />
              </div>
              <span className="text-xs text-slate-600">{m.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-400" /> Income
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Expense
        </div>
      </div>
    </div>
  );
}

/* ── Summary Card ── */
function SummaryCard({ type, label, icon, trendText, sub, value, loaded }: SummaryCardProps) {
  const accentMap: Record<SummaryCardProps["type"], { bar: string; iconBg: string; trendCls: string }> = {
    income:  { bar: "#22d67a", iconBg: "rgba(34,214,122,0.12)",  trendCls: "bg-green-500/10 text-green-400"  },
    expense: { bar: "#f25c5c", iconBg: "rgba(242,92,92,0.12)",   trendCls: "bg-red-500/10 text-red-400"      },
    balance: { bar: "#00c8ff", iconBg: "rgba(0,200,255,0.12)",   trendCls: "bg-cyan-500/10 text-cyan-400"    },
    savings: { bar: "#a855f7", iconBg: "rgba(168,85,247,0.12)",  trendCls: "bg-purple-500/10 text-purple-400"},
  };
  const acc = accentMap[type];

  return (
    <div
      className="relative rounded-2xl border border-white/[0.07] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(0,200,255,0.12)] hover:border-cyan-500/20 cursor-default"
      style={{ background: "#0e1620" }}
    >
      <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl" style={{ background: acc.bar }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: acc.iconBg }}>{icon}</div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${acc.trendCls}`}>{trendText}</span>
        </div>
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">{label}</div>
        {loaded
          ? <div className="font-extrabold text-2xl text-white" style={{ fontFamily: "Syne, sans-serif" }}>{fmt(value)}</div>
          : <div className="h-7 w-28 rounded animate-pulse" style={{ background: "#162031" }} />}
        <div className="text-xs text-slate-600 mt-1.5">{sub}</div>
      </div>
    </div>
  );
}

/* ── Recurring Item ── */
function RecurringItem({ item }: RecurringItemProps) {
  const statusMap: Record<RecurringPayment["status"], string> = {
    active: "bg-green-500/10 text-green-400",
    due:    "bg-amber-500/10 text-amber-400",
    missed: "bg-red-500/10 text-red-400",
  };
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] transition-colors hover:border-cyan-500/20 cursor-default"
      style={{ background: "#111c2b" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: item.color }}>{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.name}</div>
        <div className="text-xs text-slate-400 mt-0.5">{item.date}</div>
      </div>
      <div className="text-right flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-red-400">−{fmt(item.amount)}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusMap[item.status]}`}>{item.status}</span>
      </div>
    </div>
  );
}

/* ── Unusual Item ── */
function UnusualItem({ item }: UnusualItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-default"
      style={{ background: "rgba(242,92,92,0.05)", borderColor: "rgba(242,92,92,0.15)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: "rgba(242,92,92,0.12)" }}>{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.name}</div>
        <div className="text-xs mt-0.5" style={{ color: "#f5a623" }}>⚠ {item.reason}</div>
      </div>
      <span className="font-mono text-sm font-medium text-red-400">−{fmt(item.amount)}</span>
    </div>
  );
}

/* ── Empty Placeholder ── */
function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
      <span className="text-3xl opacity-30">{icon}</span>
      <span className="text-xs">{message}</span>
    </div>
  );
}

/* ── Transactions Table ── */
function TxTable({ txList }: TxTableProps) {
  const statusMap: Record<Transaction["status"], { dot: string; label: string; cls: string }> = {
    completed: { dot: "bg-green-400 shadow-[0_0_6px_#22d67a]", label: "Completed", cls: "text-green-400" },
    pending:   { dot: "bg-amber-400 shadow-[0_0_6px_#f5a623]", label: "Pending",   cls: "text-amber-400" },
    flagged:   { dot: "bg-red-400 shadow-[0_0_6px_#f25c5c]",   label: "Flagged",   cls: "text-red-400"   },
  };

  if (txList.length === 0) {
    return <EmptyState icon="📄" message="No transactions yet. Upload a bank statement to get started." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: "#111c2b" }}>
            {["Date", "Transaction", "Category", "Amount", "Status"].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3 text-xs font-semibold tracking-widest uppercase border-b"
                style={{ color: "#3d5166", borderColor: "rgba(255,255,255,0.07)" }}
              >{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txList.map((t, i) => {
            const s = statusMap[t.status];
            return (
              <tr key={i} className="transition-colors hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3 font-mono text-xs text-slate-400">{t.date}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: t.iconBg }}>{t.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-slate-600">{t.bank}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={{ background: `${t.catColor}18`, color: t.catColor, borderColor: `${t.catColor}30` }}
                  >{t.cat}</span>
                </td>
                <td className="px-5 py-3 font-mono text-sm font-medium" style={{ color: t.amount > 0 ? "#22d67a" : "#f25c5c" }}>
                  {t.amount > 0 ? "+" : "−"}{fmt(t.amount)}
                </td>
                <td className="px-5 py-3">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${s.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sidebar ── */
const navGroups: NavGroup[] = [
  { label: "Overview", items: [
    { icon: "⊞", label: "Dashboard", active: true },
    { icon: "📊", label: "Analytics" },
  ]},
  { label: "Finance", items: [
    { icon: "🏦", label: "Accounts" },
    { icon: "↕",  label: "Transactions" },
    { icon: "🔄", label: "Recurring" },
    { icon: "🎯", label: "Budget" },
  ]},
  { label: "Intelligence", items: [
    { icon: "🤖", label: "AI Insights" },
    { icon: "⚠️", label: "Alerts" },
    { icon: "📁", label: "Upload" },
  ]},
  { label: "Account", items: [
    { icon: "⚙", label: "Settings" },
  ]},
];

function Sidebar() {
  return (
    <aside
      className="fixed top-0 left-0 bottom-0 w-60 flex flex-col z-50 border-r"
      style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-3 px-6 py-7 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: "linear-gradient(135deg,#00c8ff,#a855f7)" }}>★</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-lg text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Statement<span style={{ color: "#00c8ff" }}>IQ</span>
          </span>
          <span
            className="text-[9px] font-semibold tracking-widest border rounded px-1.5 py-0.5"
            style={{ color: "#00c8ff", background: "rgba(0,200,255,0.1)", borderColor: "rgba(0,200,255,0.25)" }}
          >BETA</span>
        </div>
      </div>

      <nav className="flex-1 py-5 overflow-y-auto">
        {navGroups.map((g) => (
          <div key={g.label}>
            <div className="px-6 pb-2 mt-3 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#3d5166" }}>
              {g.label}
            </div>
            {g.items.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium border-l-[3px] transition-all
                  ${item.active
                    ? "border-cyan-400 text-cyan-400 bg-cyan-400/[0.06]"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]"}`}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
                {item.badge !== undefined && (
                  <span className="ml-auto text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-6 pt-4 pb-6 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style={{ background: "#111c2b" }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#00c8ff,#a855f7)" }}
          >—</div>
          <div>
            <div className="text-sm font-semibold text-white">—</div>
            <div className="text-xs" style={{ color: "#00c8ff" }}>—</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ══════════════════════════════
   MAIN DASHBOARD
   Props:
     data?    — pass your DashboardData from the API; omit to show zeros
     loading? — pass true while your fetch is in-flight
══════════════════════════════ */
export default function StatementIQ({ data, loading = false }: StatementIQProps) {
  const [activePeriod, setActivePeriod] = useState<string>("1M");
  const navigate = useNavigate();
  const [fetchedData, setFetchedData] = useState<DashboardData | undefined>(undefined);
  const [fetching, setFetching] = useState<boolean>(!data && !loading);
  const d: DashboardData = data ?? fetchedData ?? EMPTY_DATA;
  const loaded = !(loading || fetching) && !!(data ?? fetchedData);

  useEffect(() => {
    if (data) {
      setFetchedData(data);
      setFetching(false);
      return;
    }

    const token = window.localStorage.getItem("finsight_access_token");
    if (!token) {
      setFetching(false);
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setFetching(true);
      try {
        const summary = await getDashboardSummary(token);
        if (!cancelled) {
          setFetchedData(summary);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load dashboard summary:", error);
          setFetchedData(undefined);
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [data, navigate]);

  const incomeVal  = useCountUp(d.totalIncome,    1200, loaded);
  const expenseVal = useCountUp(d.totalExpense,   1200, loaded);
  const balanceVal = useCountUp(d.currentBalance, 1200, loaded);
  const savingsVal = useCountUp(d.savings,        1200, loaded);
  const hsVal      = useCountUp(d.healthScore,    1400, loaded);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        body { margin:0; background:#080d14; font-family:'DM Sans',sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fadein { animation: fadeUp .5s ease both; }
      `}</style>

      <div className="flex min-h-screen" style={{ background: "#080d14", color: "#e8f0fe" }}>
        <Sidebar />

        <main className="ml-60 flex-1 px-9 py-8 relative z-10">

          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-8 fadein">
            <div>
              <h1 className="font-extrabold text-2xl text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Financial Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex overflow-hidden rounded-lg border" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
                {(["7D","1M","3M","1Y"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`px-3.5 py-2 text-xs font-medium transition-all border-none cursor-pointer
                      ${activePeriod === p ? "text-cyan-400" : "text-slate-400 hover:text-white"}`}
                    style={{ background: activePeriod === p ? "#162031" : "transparent" }}
                  >{p}</button>
                ))}
              </div>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg border text-slate-400 hover:text-cyan-400 hover:border-cyan-400 transition-all cursor-pointer"
                style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}
              >⤓</button>
            </div>
          </div>

          {/* HEALTH SCORE BANNER */}
          <div
            className="relative rounded-2xl border p-5 flex items-center gap-8 mb-7 overflow-hidden fadein"
            style={{ background: "linear-gradient(135deg,rgba(0,200,255,0.08),rgba(168,85,247,0.08))", borderColor: "rgba(0,200,255,0.18)" }}
          >
            <div
              className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(0,200,255,0.08),transparent 70%)" }}
            />
            <div className="flex flex-col min-w-[160px]">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#00c8ff" }}>● Financial Health Score</span>
              <div className="font-extrabold leading-none mt-1 mb-1" style={{ fontFamily: "Syne, sans-serif", fontSize: 38, color: "#e8f0fe" }}>
                {loaded ? hsVal : <span className="text-slate-600">—</span>}
                <span className="text-lg font-normal text-slate-400">/850</span>
              </div>
              {loaded
                ? <span className="text-xs font-medium text-green-400">↑ Excellent standing</span>
                : <span className="text-xs text-slate-600">Upload a statement to calculate</span>}
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#111c2b" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: loaded ? `${(d.healthScore / 850) * 100}%` : "0%",
                    background: "linear-gradient(90deg,#00c8ff,#22d67a)",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Poor (0)</span><span>Fair (400)</span><span>Good (600)</span><span>Excellent (850)</span>
              </div>
            </div>

            <div className="flex gap-7">
              {([
                { val: d.transactionCount,   lbl: "Transactions" },
                { val: d.categories.length,  lbl: "Categories"   },
                { val: d.recurring.length,   lbl: "Recurring"    },
              ] as const).map((m) => (
                <div key={m.lbl} className="text-center">
                  <div className="font-bold text-lg text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                    {loaded ? m.val : <span className="text-slate-600">0</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-4 mb-7 fadein">
            <SummaryCard
              type="income" label="Total Income" icon="💚"
              trendText={loaded ? `↑ ${d.incomeChangePct}%` : "— %"}
              sub={loaded ? "This month's total inflow" : "No data yet"}
              value={incomeVal} loaded={loaded}
            />
            <SummaryCard
              type="expense" label="Total Expense" icon="🔴"
              trendText={loaded ? `↓ ${Math.abs(d.expenseChangePct)}%` : "— %"}
              sub={loaded ? "vs previous period" : "No data yet"}
              value={expenseVal} loaded={loaded}
            />
            <SummaryCard
              type="balance" label="Current Balance" icon="🔵"
              trendText="— stable"
              sub={loaded ? "across all accounts" : "No data yet"}
              value={balanceVal} loaded={loaded}
            />
            <SummaryCard
              type="savings" label="Savings / Budget" icon="💜"
              trendText={loaded ? `↑ ${d.savingsPct}%` : "— %"}
              sub={loaded ? `${d.savingsPct}% of income saved` : "No data yet"}
              value={savingsVal} loaded={loaded}
            />
          </div>

          {/* CHARTS ROW */}
          <div className="grid gap-4 mb-7 fadein" style={{ gridTemplateColumns: "1fr 380px" }}>
            <div className="rounded-2xl border p-6" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>Income vs Expense</div>
                  <div className="text-xs text-slate-400 mt-0.5">Monthly comparison</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ background: "rgba(0,200,255,0.1)", color: "#00c8ff", borderColor: "rgba(0,200,255,0.2)" }}>
                  Jan – Jun
                </span>
              </div>
              <BarChart data={d.monthlyData} />
            </div>

            <div className="rounded-2xl border p-6" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="mb-5">
                <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>Category Breakdown</div>
                <div className="text-xs text-slate-400 mt-0.5">Spending by type</div>
              </div>
              {loading
                ? <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Loading…</div>
                : <DonutChart cats={d.categories} total={d.totalExpense} />}
            </div>
          </div>

          {/* RECURRING & UNUSUAL */}
          <div className="grid grid-cols-2 gap-4 mb-7 fadein">
            <div className="rounded-2xl border p-6" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>🔄 Recurring Payments</div>
                  <div className="text-xs text-slate-400 mt-0.5">Subscriptions & scheduled bills</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ background: "rgba(0,200,255,0.1)", color: "#00c8ff", borderColor: "rgba(0,200,255,0.2)" }}>
                  {d.recurring.length} active
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {loading
                  ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
                  : d.recurring.length > 0
                    ? d.recurring.map((r) => <RecurringItem key={r.name} item={r} />)
                    : <EmptyState icon="📭" message="No recurring payments detected yet" />}
              </div>
            </div>

            <div className="rounded-2xl border p-6" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>⚠️ Unusual Transactions</div>
                  <div className="text-xs text-slate-400 mt-0.5">Anomalous spending flagged by AI</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ background: "rgba(242,92,92,0.1)", color: "#f25c5c", borderColor: "rgba(242,92,92,0.2)" }}>
                  {d.unusual.length} alerts
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {loading
                  ? <div className="text-center py-8 text-slate-600 text-sm">Loading…</div>
                  : d.unusual.length > 0
                    ? d.unusual.map((u) => <UnusualItem key={u.name} item={u} />)
                    : <EmptyState icon="🔍" message="No anomalies detected yet" />}
              </div>
            </div>
          </div>

          {/* AI SUMMARY */}
          <div
            className="relative rounded-2xl border p-6 mb-7 overflow-hidden fadein"
            style={{ background: "linear-gradient(135deg,rgba(0,200,255,0.06),rgba(168,85,247,0.06))", borderColor: "rgba(0,200,255,0.18)" }}
          >
            <div
              className="absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(168,85,247,0.1),transparent 70%)" }}
            />
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg,#00c8ff,#a855f7)", boxShadow: "0 0 20px rgba(0,200,255,0.3)" }}
              >🤖</div>
              <div>
                <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>AI Financial Summary</div>
                <div className="text-xs" style={{ color: "#00c8ff" }}>Powered by Claude · Updated now</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3.5">
              {loading
                ? [0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl animate-pulse h-20" style={{ background: "#111c2b" }} />
                  ))
                : d.aiInsights.length > 0
                  ? d.aiInsights.map((ins) => (
                      <div key={ins.title} className="rounded-xl border p-3.5" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="text-xl mb-2">{ins.icon}</div>
                        <div className="text-xs font-semibold text-slate-400 tracking-wide mb-1.5">{ins.title}</div>
                        <div className="text-sm text-white leading-relaxed">{ins.text}</div>
                      </div>
                    ))
                  : (["📈","💰","🎯","🌱"] as const).map((icon, i) => (
                      <div key={i} className="rounded-xl border p-3.5 opacity-40" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="text-xl mb-2">{icon}</div>
                        <div className="text-xs font-semibold text-slate-600 mb-1.5">Awaiting data…</div>
                        <div className="text-xs text-slate-700">Upload a statement to generate insights.</div>
                      </div>
                    ))}
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="rounded-2xl border overflow-hidden mb-7 fadein" style={{ background: "#0e1620", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div>
                <div className="font-bold text-base text-white" style={{ fontFamily: "Syne, sans-serif" }}>Transaction History</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Showing {d.txList.length} transaction{d.txList.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs text-slate-400"
                style={{ background: "#111c2b", borderColor: "rgba(255,255,255,0.07)" }}
              >🔍&nbsp; Search transactions…</div>
            </div>
            {loading
              ? (
                <div className="p-6 flex flex-col gap-3">
                  {[0,1,2].map((i) => (
                    <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "#111c2b" }} />
                  ))}
                </div>
              )
              : <TxTable txList={d.txList} />}
          </div>

        </main>
      </div>
    </>
  );
}
