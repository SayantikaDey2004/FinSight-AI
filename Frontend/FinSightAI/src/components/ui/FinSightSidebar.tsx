import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const MENU_ITEMS = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Transactions", icon: "💳", path: "/transactions" },
  { label: "Recurring Payments", icon: "🔁", path: "/recurring-payments" },
  { label: "Unusual Spending", icon: "⚠️", path: "/unusual-spending" },
  { label: "AI Insights", icon: "🤖", path: "/ai-summary" },
  { label: "Upload Statement", icon: "📂", path: "/upload" },
] as const;

export default function FinSightSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  function handleNavigate(path: string) {
    setOpen(false);

    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate(path);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 40,
          width: 46,
          height: 46,
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.16)",
          background: "rgba(15,23,42,0.88)",
          color: "#e2e8f0",
          fontSize: 22,
          fontWeight: 900,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
        }}
      >
        ☰
      </button>

      {open && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
              setOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(2,6,23,0.62)",
          }}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 320,
              maxWidth: "calc(100vw - 24px)",
              height: "calc(100vh - 24px)",
              background: "rgba(8, 13, 28, 0.98)",
              border: "1px solid rgba(148,163,184,0.14)",
              borderRadius: 24,
              padding: 18,
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 800 }}>Navigation</div>
                <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13 }}>Quick links</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(15,23,42,0.85)",
                  color: "#e2e8f0",
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {MENU_ITEMS.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.12)",
                      background: active ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.03)",
                      color: active ? "#7dd3fc" : "#e2e8f0",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
