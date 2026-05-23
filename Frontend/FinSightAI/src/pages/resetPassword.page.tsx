import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { ApiError, resetPassword as resetPasswordRequest } from "../services/authApi";

function isStrong(v: string): boolean {
  return v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v);
}
function getStrength(v: string): number {
  if (!v) return 0;
  if (v.length >= 12 && isStrong(v)) return 4;
  if (isStrong(v)) return 3;
  if (v.length >= 8) return 2;
  return 1;
}
const STRENGTH_LABELS = ["", "Weak", "Fair", "Strong", "Excellent"];
const STRENGTH_COLORS = ["", "#f87171", "#fb923c", "#facc15", "#34d399"];

/* ── Icons ── */
function ResetIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <circle cx="12" cy="12" r="1" fill="#818cf8" stroke="none" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function EyeIcon({ open }: { open?: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function CheckIcon({ size = 22, color = "#34d399" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none"
      stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1.5,5 4,7.5 8.5,2.5" />
    </svg>
  );
}

/* ── Password field with show/hide toggle ── */
interface PasswordFieldProps {
  id: string;
  label: React.ReactNode;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: React.ReactNode;
}
function PasswordField({ id, label, placeholder, value, onChange, hint }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.18em", color: "#4a5568",
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {/* Left lock icon */}
        <span style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "#4a5568", pointerEvents: "none", display: "flex",
        }}>
          <LockIcon />
        </span>
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={id}
          style={{
            width: "100%", padding: "13px 44px 13px 40px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, color: "#e2e8f0",
            fontSize: "0.9rem", fontFamily: "inherit", outline: "none",
            transition: "border-color .2s, box-shadow .2s",
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(99,102,241,0.6)";
            e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
          }}
          onBlur={e => {
            e.target.style.borderColor = "rgba(255,255,255,0.08)";
            e.target.style.boxShadow = "none";
          }}
        />
        {/* Right eye toggle */}
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", padding: 4,
            color: "#4a5568", cursor: "pointer", display: "flex",
            transition: "color .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#818cf8"}
          onMouseLeave={e => e.currentTarget.style.color = "#4a5568"}
          aria-label={show ? "Hide password" : "Show password"}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint && (
        <p style={{ fontSize: "0.73rem", color: "#4a5568", margin: 0, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── Primary button ── */
interface PrimaryBtnProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}
function PrimaryBtn({ children, type = "submit", onClick, disabled }: PrimaryBtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        width: "100%", padding: "13px 20px",
        background: disabled
          ? "rgba(99,102,241,0.35)"
          : "linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)",
        border: "none", borderRadius: 12, color: "#fff",
        fontSize: "0.9rem", fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity .2s",
        opacity: disabled ? 0.6 : 1,
        letterSpacing: "0.01em",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? "0.6" : "1"; }}
    >
      {children}
    </button>
  );
}

/* ── Back to login ghost button ── */
function BackBtn({ onClick }: { onClick?: (e?: any) => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        width: "100%", padding: "11px 20px",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, color: "#94a3b8",
        fontSize: "0.9rem", fontWeight: 500, fontFamily: "inherit",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "border-color .2s, color .2s, background .2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
        e.currentTarget.style.color = "#c7d2fe";
        e.currentTarget.style.background = "rgba(99,102,241,0.06)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "#94a3b8";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <ArrowLeft />
      <span>Back to Login</span>
    </button>
  );
}

/* ── Error box ── */
function ErrBox({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
      borderRadius: 10, padding: "10px 14px",
      fontSize: "0.8rem", color: "#fca5a5", lineHeight: 1.5,
    }}>
      {msg}
    </div>
  );
}

/* ══ Reset Password Form ══ */
function ResetForm({ token, onDone, onBack, onRequestNew }: { token: string; onDone?: () => void; onBack?: () => void; onRequestNew?: () => void }) {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pwErr = useMemo(() => pw && !isStrong(pw)
    ? "Use 8+ chars with uppercase, lowercase & a number." : "", [pw]);
  const cfErr = useMemo(() => cf && cf !== pw
    ? "Passwords do not match." : "", [cf, pw]);
  const display = err || pwErr || cfErr;
  const s = getStrength(pw);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    if (!token) { setErr("Missing reset token. Please request a new reset email."); return; }
    if (!pw || !cf) { setErr("Both fields are required."); return; }
    if (!isStrong(pw)) { setErr("Use 8+ chars with uppercase, lowercase & a number."); return; }
    if (pw !== cf) { setErr("Passwords do not match."); return; }
    setLoading(true);
    try {
      await resetPasswordRequest({ token, new_password: pw });
      if (onDone) onDone();
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Unable to reset the password right now.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header (outside card) ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* App icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
        }}>
          <ResetIcon />
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "1.9rem", fontWeight: 800, color: "#f1f5f9",
            margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            Reset Password
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            Enter your new password below
          </p>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{
        background: "linear-gradient(160deg, #0d1424 0%, #090f1e 100%)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 20,
        padding: "2rem",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.55)",
      }}>
        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <ErrBox msg={display} />

          {/* New Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PasswordField
              id="new-password"
              label="New Password"
              placeholder="Enter new password"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(""); }}
              hint="Must be at least 8 characters with uppercase, lowercase, and number"
            />
            {pw && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      height: 4, borderRadius: 99,
                      transition: "background .35s",
                      background: i <= s ? STRENGTH_COLORS[s] : "rgba(255,255,255,0.07)",
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                  {STRENGTH_LABELS[s]} password
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <PasswordField
            id="confirm-password"
            label="Confirm Password"
            placeholder="Confirm new password"
            value={cf}
            onChange={e => { setCf(e.target.value); setErr(""); }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
            <PrimaryBtn disabled={loading}>
              {loading ? "Resetting…" : <><span>Reset Password</span><ArrowRight /></>}
            </PrimaryBtn>
            <BackBtn onClick={onBack} />
          </div>
        </form>
      </div>

      {/* ── Footer link ── */}
      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#475569", margin: 0 }}>
        Link expired?{" "}
        <button type="button" onClick={onRequestNew}
          style={{
            background: "none", border: "none", padding: 0,
            color: "#818cf8", fontWeight: 600, fontSize: "inherit",
            fontFamily: "inherit", cursor: "pointer",
            textDecoration: "underline", textDecorationColor: "rgba(129,140,248,0.4)",
            textUnderlineOffset: "3px", transition: "color .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#a5b4fc"}
          onMouseLeave={e => e.currentTarget.style.color = "#818cf8"}
        >
          Request a new one
        </button>
      </p>
    </div>
  );
}

/* ══ Success Screen ══ */
function SuccessScreen({ onLogin }: { onLogin?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "rgba(52,211,153,0.12)",
          border: "1px solid rgba(52,211,153,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(52,211,153,0.15)",
        }}>
          <CheckIcon size={28} color="#34d399" />
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "1.9rem", fontWeight: 800, color: "#6ee7b7",
            margin: "0 0 6px", letterSpacing: "-0.02em",
          }}>
            Password Reset!
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            Your password has been successfully updated
          </p>
        </div>
      </div>

      <div style={{
        background: "linear-gradient(160deg, #0d1424 0%, #090f1e 100%)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 20, padding: "2rem",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)",
          borderRadius: 10, padding: "12px 14px",
          fontSize: "0.8rem", color: "#6ee7b7", lineHeight: 1.6,
        }}>
          Your account is now secured with your new password. You can sign in right away.
        </div>
        <PrimaryBtn type="button" onClick={onLogin}>
          <span>Go to Login</span><ArrowRight />
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ══ ROOT ══ */
export default function ResetPasswordPage(): React.ReactElement {
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const navigate = useNavigate();
  function goToLogin() { navigate("/login"); }
  function requestNew() { navigate("/forgot-password"); }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body {
          font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
          background: #070c18;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        input::placeholder { color: #2d3748 !important; }
        .rp-wrap {
          width: 100%;
          max-width: 420px;
        }
        @media (max-width: 480px) {
          body { padding: 1.5rem 1rem 3rem; align-items: flex-start; }
        }
      `}</style>

      <AuthShell>
        <div className="rp-wrap">
          {!done
            ? token
              ? <ResetForm token={token} onDone={() => setDone(true)} onBack={goToLogin} onRequestNew={requestNew} />
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(129,140,248,0.15)" }}>
                      <ResetIcon />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                        Reset Password
                      </h1>
                      <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
                        Open the password reset link from your email to continue.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(160deg, #0d1424 0%, #090f1e 100%)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: "2rem", boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "12px 14px", fontSize: "0.8rem", color: "#c7d2fe", lineHeight: 1.6 }}>
                      This page now expects the token from the reset email. If you don't have one, request a new reset link.
                    </div>
                    <PrimaryBtn type="button" onClick={requestNew}>
                      <span>Request reset link</span><ArrowRight />
                    </PrimaryBtn>
                    <BackBtn onClick={goToLogin} />
                  </div>
                </div>
              )
            : <SuccessScreen onLogin={goToLogin} />
          }
        </div>
      </AuthShell>
    </>
  );
}