import { useState, useEffect } from "react";

// ─────────────────────────────────────────────
// API HOOK — replace fetchUserProfile with your
// real API call, e.g. fetch('/api/user/profile')
// ─────────────────────────────────────────────
function useUserProfile() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // ── REPLACE THIS with your real API call ──
        // const res  = await fetch('/api/user/profile', {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        // });
        // if (!res.ok) throw new Error('Failed to fetch user');
        // const data = await res.json();
        // setUser(data);

        // MOCK — remove once API is wired
        await new Promise(r => setTimeout(r, 800));
        setUser({
          name:        "",      // from db: users.full_name
          email:       "",      // from db: users.email
          joined:      "",      // from db: users.created_at
          avatar:      "",      // initials derived from name
          healthScore: null,    // from db: health_scores.score
          healthMax:   850,
          healthStatus:"",      // from db: health_scores.status
          savings: {
            amount:   "",       // from db: savings.monthly_amount
            change:   "",       // from db: savings.change_pct
            positive: true,
          },
          stats: [],            // from db: user_stats table
          features: [],         // from db: user_features table
          activity: [],         // from db: activity_log table
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { user, loading, error };
}

// ─────────────────────────────────────────────
// SMALL UI PIECES
// ─────────────────────────────────────────────
function Avatar({ initials }) {
  return (
    <div style={{
      width: 68, height: 68, borderRadius: "50%",
      background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.4rem", fontWeight: 800, color: "#fff", flexShrink: 0,
      boxShadow: "0 0 0 3px rgba(99,102,241,0.25), 0 0 24px rgba(99,102,241,0.2)",
    }}>
      {initials || "?"}
    </div>
  );
}

function Badge({ children, color = "#38bdf8" }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 100,
      background: `${color}18`, border: `1px solid ${color}35`,
      fontSize: 10, fontWeight: 700, color,
      letterSpacing: "0.12em", textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "linear-gradient(160deg,#0d1424,#090f1e)",
      border: "1px solid rgba(99,102,241,0.1)",
      borderRadius: 16, padding: "1.5rem", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.2em", color: "#334155", marginBottom: 14,
    }}>
      {children}
    </p>
  );
}

function Skeleton({ w = "100%", h = 16, radius = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "rgba(255,255,255,0.05)",
      animation: "shimmer 1.6s ease-in-out infinite",
    }} />
  );
}

const ACTIVITY_COLORS = {
  upload:   "#38bdf8",
  score:    "#34d399",
  report:   "#818cf8",
  security: "#fb923c",
  account:  "#f472b6",
  default:  "#64748b",
};

// ─────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────
function OverviewTab({ user }) {
  const healthPct = user.healthScore && user.healthMax
    ? (user.healthScore / user.healthMax) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Health + Savings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>

        <Card>
          <SectionLabel>Health Score</SectionLabel>
          {user.healthScore ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1, letterSpacing: "-0.04em" }}>
                  {user.healthScore}
                </span>
                <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 600, paddingBottom: 5 }}>
                  /{user.healthMax}
                </span>
              </div>
              {user.healthStatus && (
                <div style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600, marginBottom: 14 }}>
                  ↑ {user.healthStatus}
                </div>
              )}
              <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, width: `${healthPct}%`,
                  background: "linear-gradient(90deg,#6366f1,#34d399)",
                  transition: "width 1.2s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 9, color: "#334155" }}>0</span>
                <span style={{ fontSize: 9, color: "#334155" }}>{user.healthMax}</span>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton h={40} w="60%" />
              <Skeleton h={5} />
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Monthly Savings</SectionLabel>
          {user.savings?.amount ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 7px #34d399" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  This month
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 6 }}>
                {user.savings.amount}
              </div>
              <div style={{ fontSize: "0.78rem", color: user.savings.positive ? "#34d399" : "#f87171", fontWeight: 600 }}>
                {user.savings.positive ? "↑" : "↓"} {user.savings.change}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton h={40} w="70%" />
              <Skeleton h={12} w="50%" />
            </div>
          )}
        </Card>
      </div>

      {/* Stats */}
      {user.stats?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {user.stats.map((s, i) => (
            <Card key={i} style={{ padding: "1.1rem 1.4rem" }}>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: s.color || "#38bdf8", letterSpacing: "-0.03em", marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 500, lineHeight: 1.4 }}>
                {s.label}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Features */}
      {user.features?.length > 0 && (
        <Card>
          <SectionLabel>Features</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {user.features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "13px 15px", borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "border-color .2s",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: f.active ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${f.active ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.05)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem", color: f.active ? "#818cf8" : "#334155",
                }}>
                  {f.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: f.active ? "#e2e8f0" : "#475569" }}>
                      {f.title}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                      background: f.active ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${f.active ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)"}`,
                      color: f.active ? "#34d399" : "#334155",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                    }}>
                      {f.active ? "Active" : "Locked"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.73rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!user.healthScore && !user.savings?.amount && (!user.stats || user.stats.length === 0) && (
        <Card style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>📊</div>
          <p style={{ color: "#475569", fontSize: "0.875rem", marginBottom: 6 }}>No data yet</p>
          <p style={{ color: "#334155", fontSize: "0.75rem" }}>Upload your first bank FinSight to see your insights here.</p>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: ACTIVITY
// ─────────────────────────────────────────────
function ActivityTab({ activity }) {
  if (!activity?.length) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <p style={{ color: "#475569", fontSize: "0.875rem" }}>No activity yet.</p>
      </Card>
    );
  }
  return (
    <Card>
      <SectionLabel>Recent Activity</SectionLabel>
      {activity.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "13px 0",
          borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
            background: ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.default,
            boxShadow: `0 0 8px ${ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.default}55`,
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.83rem", color: "#cbd5e1", fontWeight: 500, margin: 0 }}>{a.action}</p>
          </div>
          <span style={{ fontSize: "0.7rem", color: "#334155", whiteSpace: "nowrap" }}>{a.time}</span>
        </div>
      ))}
    </Card>
  );
}

// ─────────────────────────────────────────────
// TAB: SETTINGS
// ─────────────────────────────────────────────
function SettingsTab({ user, onLogout }) {
  const [name, setName]   = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // Replace with: await fetch('/api/user/profile', { method: 'PATCH', body: JSON.stringify({ name, email }) })
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputSt = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#e2e8f0",
    fontSize: "0.875rem", fontFamily: "inherit", outline: "none",
    transition: "border-color .2s, box-shadow .2s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <Card>
        <SectionLabel>Account Information</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Full Name",      value: name,  set: setName,  type: "text",  ph: "Your full name" },
            { label: "Email Address",  value: email, set: setEmail, type: "email", ph: "your@email.com" },
          ].map((f, i) => (
            <div key={i}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#4a5568", display: "block", marginBottom: 7 }}>
                {f.label}
              </label>
              <input type={f.type} value={f.value} placeholder={f.ph}
                onChange={e => f.set(e.target.value)}
                style={inputSt}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            {saved && <span style={{ fontSize: "0.75rem", color: "#34d399" }}>✓ Saved</span>}
            <button onClick={handleSave} style={{
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
              color: "#fff", fontFamily: "inherit", fontSize: "0.83rem",
              fontWeight: 600, cursor: "pointer",
            }}>
              Save Changes
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>Security</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: "0.875rem", color: "#cbd5e1", fontWeight: 600, marginBottom: 3 }}>Password</p>
            <p style={{ fontSize: "0.73rem", color: "#475569" }}>Update your password to keep your account secure.</p>
          </div>
          <button style={{
            padding: "8px 18px", borderRadius: 9,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          }}>
            Change Password
          </button>
        </div>
      </Card>

      <Card>
        <SectionLabel>Session</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: "0.875rem", color: "#cbd5e1", fontWeight: 600, marginBottom: 3 }}>Sign Out</p>
            <p style={{ fontSize: "0.73rem", color: "#475569" }}>End your current session and return to the login page.</p>
          </div>
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 18px", borderRadius: 9,
            background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)",
            color: "#fca5a5", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
            transition: "all .2s",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </Card>

      <Card style={{ border: "1px solid rgba(248,113,113,0.14)", background: "rgba(248,113,113,0.02)" }}>
        <SectionLabel>Danger Zone</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: "0.875rem", color: "#fca5a5", fontWeight: 600, marginBottom: 3 }}>Delete Account</p>
            <p style={{ fontSize: "0.73rem", color: "#475569" }}>Permanently removes your account and all associated data.</p>
          </div>
          <button style={{
            padding: "8px 18px", borderRadius: 9,
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)",
            color: "#fca5a5", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          }}>
            Delete Account
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────
export default function UserProfile() {
  const { user, loading, error } = useUserProfile();
  const [activeTab, setActiveTab]       = useState("overview");
  const [showLogoutModal, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut]      = useState(false);
  const tabs = ["overview", "activity", "settings"];

  async function handleLogout() {
    setLoggingOut(true);
    // ── REPLACE with your real logout logic ──
    // await fetch('/api/auth/logout', { method: 'POST' });
    // localStorage.removeItem('token');
    // window.location.href = '/login';
    await new Promise(r => setTimeout(r, 900)); // mock delay
    setLoggingOut(false);
    setShowLogout(false);
    // redirect after real logout: window.location.href = '/login';
  }

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100%; }
        body {
          font-family: 'DM Sans','Segoe UI', system-ui, sans-serif;
          background: #070c18; color: #e2e8f0; min-height: 100vh;
        }
        input::placeholder { color: #2d3748 !important; }
        @keyframes shimmer {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .tab-btn {
          padding: 7px 18px; border-radius: 8px; border: none;
          font-family: inherit; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all .2s; text-transform: capitalize; letter-spacing: 0.02em;
        }
        .tab-active   { background: linear-gradient(135deg,#6366f1,#0ea5e9); color: #fff; }
        .tab-inactive { background: transparent; color: #475569; }
        .tab-inactive:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
        .logout-nav-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px;
          background: rgba(248,113,113,0.07);
          border: 1px solid rgba(248,113,113,0.18);
          color: #fca5a5; font-family: inherit;
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all .2s; letter-spacing: 0.02em;
        }
        .logout-nav-btn:hover {
          background: rgba(248,113,113,0.14);
          border-color: rgba(248,113,113,0.35);
        }
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn .18s ease;
        }
        .modal-box {
          background: linear-gradient(160deg,#0d1424,#090f1e);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 18px; padding: 2rem;
          width: 100%; max-width: 380px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6);
          animation: slideUp .2s ease;
        }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:none; opacity:1 } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 70% -10%, rgba(99,102,241,0.07) 0%, #070c18 45%)" }}>

        {/* Nav */}
        <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(7,12,24,0.85)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 50,
          padding: "0 2rem", display: "flex", alignItems: "center",
          justifyContent: "space-between", height: 58,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 800, color: "#fff",
            }}>SQ</div>
            <span style={{ fontSize: "0.93rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
              FinSight<span style={{ color: "#38bdf8" }}>AI</span>
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              background: "rgba(56,189,248,0.08)", color: "#38bdf8",
              border: "1px solid rgba(56,189,248,0.18)", letterSpacing: "0.1em",
            }}>BETA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="logout-nav-btn" onClick={() => setShowLogout(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.72rem", fontWeight: 800, color: "#fff", cursor: "pointer",
            }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {error && (
            <div style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 20,
              fontSize: "0.83rem", color: "#fca5a5",
            }}>
              Failed to load profile: {error}
            </div>
          )}

          {/* Profile hero */}
          <Card style={{ marginBottom: 18, padding: "1.75rem 2rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {loading ? (
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "shimmer 1.6s infinite" }} />
                ) : (
                  <Avatar initials={initials} />
                )}
                <div>
                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <Skeleton w={160} h={22} />
                      <Skeleton w={200} h={14} />
                      <Skeleton w={120} h={12} />
                    </div>
                  ) : (
                    <>
                      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 4 }}>
                        {user?.name || "—"}
                      </h1>
                      <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 6 }}>
                        {user?.email || "—"}
                      </p>
                      {user?.joined && (
                        <span style={{ fontSize: "0.7rem", color: "#334155" }}>
                          Member since {user.joined}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {!loading && (
                <button style={{
                  padding: "8px 18px", borderRadius: 9,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8", fontFamily: "inherit", fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer", transition: "all .2s",
                }}>
                  Edit Profile
                </button>
              )}
            </div>
          </Card>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 18,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10, padding: 4, width: "fit-content",
          }}>
            {tabs.map(t => (
              <button key={t} className={`tab-btn ${activeTab === t ? "tab-active" : "tab-inactive"}`}
                onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map(i => (
                <Card key={i} style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Skeleton w="40%" h={12} />
                    <Skeleton h={20} />
                    <Skeleton h={20} />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {activeTab === "overview"  && <OverviewTab user={user} />}
              {activeTab === "activity"  && <ActivityTab activity={user?.activity} />}
              {activeTab === "settings"  && <SettingsTab user={user} onLogout={() => setShowLogout(true)} />}
            </>
          )}
        </div>
      </div>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => !loggingOut && setShowLogout(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 13,
              background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>

            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              Sign out?
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
              You'll be logged out of your FinSightAI account. Any unsaved changes will be lost.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowLogout(false)}
                disabled={loggingOut}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)", color: "#94a3b8",
                  fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 600,
                  cursor: loggingOut ? "not-allowed" : "pointer", opacity: loggingOut ? 0.5 : 1,
                }}>
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10, border: "none",
                  background: loggingOut ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.85)",
                  color: "#fff", fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 600,
                  cursor: loggingOut ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "background .2s",
                }}>
                {loggingOut ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    Signing out…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Yes, sign out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}