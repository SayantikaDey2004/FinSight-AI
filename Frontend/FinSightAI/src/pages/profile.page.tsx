import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, clearAuthSession, fetchCurrentUser, getStoredUser, logout as logoutRequest, setStoredUser, updateProfile, type AuthUser } from "../services/authApi";

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(160deg, rgba(12,18,36,0.95), rgba(7,12,24,0.92))", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700, marginBottom: 12 }}>{children}</p>;
}

function Skeleton({ width = "100%", height = 16 }: { width?: string | number; height?: number }) {
  return <div style={{ width, height, borderRadius: 12, background: "rgba(255,255,255,0.06)" }} />;
}

function initialsFromName(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]?.toUpperCase() || "").slice(0, 2).join("") || "?";
}

export default function UserProfile() {
  const navigate = useNavigate();
  const cachedUser = getStoredUser();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [name, setName] = useState(cachedUser?.name ?? "");
  const [email, setEmail] = useState(cachedUser?.email ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const currentUser = await fetchCurrentUser();
        if (!active) {
          return;
        }

        setUser(currentUser);
        setName(currentUser.name);
        setEmail(currentUser.email);
        setStoredUser(currentUser);
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to load profile.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  const joinedLabel = useMemo(() => {
    if (!user?.created_at) {
      return "Member since recent signup";
    }

    return `Member since ${new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }, [user?.created_at]);

  const avatar = initialsFromName(user?.name || name);

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatusMessage(null);

    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() });
      setUser(updated);
      setStoredUser(updated);
      setStatusMessage("Profile saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(14,165,233,0.16), transparent 32%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)", color: "#e2e8f0" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; } input::placeholder { color: #5b6477; }`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(16px)", background: "rgba(4,8,20,0.72)", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>StatementIQ</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Profile</div>
          </div>
          <button onClick={handleLogout} disabled={loggingOut} style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(248,113,113,0.22)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", cursor: loggingOut ? "not-allowed" : "pointer", fontWeight: 700 }}>
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 48px" }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, padding: 24, alignItems: "center" }}>
            <div style={{ width: 76, height: 76, borderRadius: 24, background: "linear-gradient(135deg, #38bdf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", boxShadow: "0 20px 40px rgba(56,189,248,0.18)" }}>
              {avatar}
            </div>
            <div>
              <Label>Account</Label>
              {loading ? (
                <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
                  <Skeleton width="70%" height={24} />
                  <Skeleton width="85%" height={16} />
                  <Skeleton width="45%" height={14} />
                </div>
              ) : (
                <>
                  <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1, letterSpacing: "-0.04em" }}>{user?.name || "Your profile"}</h1>
                  <p style={{ margin: "10px 0 6px", color: "#94a3b8" }}>{user?.email || "No email found"}</p>
                  <p style={{ margin: 0, color: "#7dd3fc", fontSize: 13 }}>{joinedLabel}</p>
                </>
              )}
            </div>
          </div>
        </Card>

        {error && <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.18)", color: "#fca5a5" }}>{error}</div>}
        {statusMessage && <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.16)", color: "#86efac" }}>{statusMessage}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.75fr)", gap: 18, marginTop: 18 }}>
          <Card>
            <div style={{ padding: 24 }}>
              <Label>Edit Profile</Label>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "#94a3b8" }}>Full name</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" style={{ width: "100%", padding: "13px 14px", borderRadius: 14, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "#94a3b8" }}>Email address</label>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" style={{ width: "100%", padding: "13px 14px", borderRadius: 14, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", outline: "none" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button onClick={handleSave} disabled={saving} style={{ padding: "11px 18px", borderRadius: 999, border: "none", background: saving ? "rgba(56,189,248,0.5)" : "linear-gradient(135deg, #38bdf8, #6366f1)", color: "#fff", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gap: 18 }}>
            <Card>
              <div style={{ padding: 24 }}>
                <Label>Account Status</Label>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}><span>Status</span><span style={{ color: user?.is_active ? "#86efac" : "#fca5a5" }}>{user?.is_active ? "Active" : "Inactive"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}><span>Verification</span><span style={{ color: user?.is_verified ? "#86efac" : "#fbbf24" }}>{user?.is_verified ? "Verified" : "Pending"}</span></div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: 24 }}>
                <Label>Session</Label>
                <p style={{ marginTop: 0, color: "#94a3b8", lineHeight: 1.6 }}>Your account session is managed by the backend. Logging out clears the stored tokens and returns you to login.</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
