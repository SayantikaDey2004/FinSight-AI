import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { ApiError, forgotPassword as forgotPasswordRequest } from "../services/authApi";

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

function CheckIcon({ size = 11, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none"
      stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1.5,5 4,7.5 8.5,2.5" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
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
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
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

interface FieldProps {
  id: string;
  label: React.ReactNode;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
}
function Field({ id, label, type = "text", placeholder, value, onChange, icon, hint }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.18em", color: "#4a5568",
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "#4a5568", pointerEvents: "none", display: "flex",
        }}>
          {icon}
        </span>
        <input
          id={id} type={type} placeholder={placeholder}
          value={value} onChange={onChange} autoComplete={id}
          style={{
            width: "100%", padding: "13px 14px 13px 40px",
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
      </div>
      {hint && <p style={{ fontSize: "0.73rem", color: "#4a5568", margin: 0, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

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
        transition: "opacity .2s, transform .1s",
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

function BackBtn({ onClick }: { onClick?: (e?: any) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", padding: "11px 20px",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, color: "#94a3b8",
        fontSize: "0.9rem", fontWeight: 500, fontFamily: "inherit",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "border-color .2s, color .2s, background .2s",
        letterSpacing: "0.01em",
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
      <span>Back to login</span>
    </button>
  );
}

function SignInLink({ onClick }: { onClick?: (e?: any) => void }) {
  return (
    <p style={{
      textAlign: "center",
      fontSize: "0.8rem",
      color: "#475569",
      margin: 0,
      lineHeight: 1.5,
    }}>
      Remember your password?{" "}
      <button
        type="button"
        onClick={onClick}
        style={{
          background: "none", border: "none", padding: 0,
          color: "#818cf8", fontWeight: 600, fontSize: "inherit",
          fontFamily: "inherit", cursor: "pointer",
          textDecoration: "underline", textDecorationColor: "rgba(129,140,248,0.4)",
          textUnderlineOffset: "3px",
          transition: "color .2s, text-decoration-color .2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#a5b4fc";
          e.currentTarget.style.textDecorationColor = "rgba(165,180,252,0.7)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "#818cf8";
          e.currentTarget.style.textDecorationColor = "rgba(129,140,248,0.4)";
        }}
      >
        Sign in here
      </button>
    </p>
  );
}

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

/* ══ CHECK EMAIL STEP ══ */
function CheckEmailStep({ email, onBack, onResend }: { email: string; onBack?: () => void; onResend?: () => void }) {
  const [resent, setResent] = useState(false);

  function handleResend() {
    setResent(true);
    setTimeout(() => setResent(false), 3000);
    if (onResend) onResend();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Green circle check icon */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg, #22c55e, #16a34a)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 28px rgba(34,197,94,0.28)",
      }}>
        <svg width="26" height="26" viewBox="0 0 10 10" fill="none"
          stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1.5,5 4,7.5 8.5,2.5" />
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 10px", lineHeight: 1.3 }}>
          Check Your Email
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 4px", lineHeight: 1.7 }}>
          We've sent password reset instructions to
        </p>
        <p style={{ fontSize: "0.88rem", color: "#a5b4fc", fontWeight: 600, margin: 0, wordBreak: "break-all" }}>
          {email}
        </p>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* Hint box */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "11px 14px",
        fontSize: "0.8rem", color: "#64748b", lineHeight: 1.7,
      }}>
        Didn't receive the email? Check your spam folder or{" "}
        <button type="button" onClick={handleResend} style={{
          background: "none", border: "none", padding: 0,
          color: resent ? "#34d399" : "#818cf8",
          fontWeight: 600, fontSize: "inherit", fontFamily: "inherit",
          cursor: "pointer", transition: "color .3s",
        }}>
          {resent ? "Sent ✓" : "try again"}
        </button>
        .
      </div>

      {/* Back to Login primary button */}
      <button type="button" onClick={onBack} style={{
        width: "100%", padding: "13px 20px",
        background: "linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)",
        border: "none", borderRadius: 12, color: "#fff",
        fontSize: "0.9rem", fontWeight: 600, fontFamily: "inherit",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity .2s", letterSpacing: "0.01em",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <span>Back to Login</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

/* ══ STEP 1 — Email ══ */
function EmailStep({ onNext, onGoToLogin }: { onNext: (email: string) => void; onGoToLogin?: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    if (!email) { setErr("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Enter a valid email address."); return; }
    setLoading(true);
    try {
      const response = await forgotPasswordRequest({ email });
      if (response.reset_token) {
        navigate(`/reset-password?token=${encodeURIComponent(response.reset_token)}`);
        return;
      }
      onNext(email);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Unable to send reset email right now.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(14,165,233,0.2))",
        border: "1px solid rgba(99,102,241,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <MailIcon />
      </div>

      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", lineHeight: 1.3 }}>
          Forgot your password?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
          Enter the email linked to your account and we'll send you a reset link.
        </p>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ErrBox msg={err} />
        <Field
          id="email" label="Email address" type="email"
          placeholder="you@example.com"
          value={email} onChange={e => { setEmail(e.target.value); setErr(""); }}
          icon={<MailIcon />}
          hint="We'll send a password reset link to this address."
        />
        <PrimaryBtn disabled={loading}>
          {loading ? "Sending link…" : <><span>Send reset link</span><ArrowRight /></>}
        </PrimaryBtn>
        <BackBtn onClick={onGoToLogin} />
      </form>

      <SignInLink onClick={onGoToLogin} />
    </div>
  );
}

  function PasswordStep({ email, onDone, onGoToLogin }: { email: string; onDone?: () => void; onGoToLogin?: () => void }) {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pwErr = useMemo(() => pw && !isStrong(pw) ? "Use 8+ chars with uppercase, lowercase & a number." : "", [pw]);
  const cfErr = useMemo(() => cf && cf !== pw ? "Passwords do not match." : "", [cf, pw]);
  const display = err || pwErr || cfErr;
  const s = getStrength(pw);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    if (!pw || !cf) { setErr("Both fields are required."); return; }
    if (!isStrong(pw)) { setErr("Use 8+ chars with uppercase, lowercase & a number."); return; }
    if (pw !== cf) { setErr("Passwords do not match."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); if (onDone) onDone(); }, 900);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(14,165,233,0.2))",
        border: "1px solid rgba(99,102,241,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <LockIcon />
      </div>

      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", lineHeight: 1.3 }}>
          Set a new password
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
          Resetting password for <span style={{ color: "#818cf8", fontWeight: 500 }}>{email}</span>
        </p>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ErrBox msg={display} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="new-password" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#4a5568" }}>
            New password
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4a5568", pointerEvents: "none", display: "flex" }}>
              <LockIcon />
            </span>
            <input
              id="new-password" type="password" placeholder="Enter a strong password"
              value={pw} onChange={e => { setPw(e.target.value); setErr(""); }}
              autoComplete="new-password"
              style={{ width: "100%", padding: "13px 14px 13px 40px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", transition: "border-color .2s, box-shadow .2s" }}
              onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          {pw && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 2 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ height: 4, borderRadius: 99, transition: "background .35s", background: i <= s ? STRENGTH_COLORS[s] : "rgba(255,255,255,0.07)" }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{STRENGTH_LABELS[s]} password</p>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="confirm-password" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#4a5568" }}>
            Confirm password
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4a5568", pointerEvents: "none", display: "flex" }}>
              <LockIcon />
            </span>
            <input
              id="confirm-password" type="password" placeholder="Repeat the password"
              value={cf} onChange={e => { setCf(e.target.value); setErr(""); }}
              autoComplete="new-password"
              style={{ width: "100%", padding: "13px 14px 13px 40px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", transition: "border-color .2s, box-shadow .2s" }}
              onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        <PrimaryBtn disabled={loading}>
          {loading ? "Updating…" : <><span>Update password</span><ArrowRight /></>}
        </PrimaryBtn>
        <BackBtn onClick={onGoToLogin} />
      </form>

      <SignInLink onClick={onGoToLogin} />
    </div>
  );
}

function SuccessStep({ onRestart }: { onRestart?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "rgba(52,211,153,0.12)",
        border: "1px solid rgba(52,211,153,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <CheckIcon size={22} color="#34d399" />
      </div>

      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6ee7b7", margin: "0 0 6px", lineHeight: 1.3 }}>
          Password updated!
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
          Your account is now secured. You can sign in with your new password.
        </p>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      <div style={{
        background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)",
        borderRadius: 10, padding: "12px 14px",
        fontSize: "0.78rem", color: "#6ee7b7", lineHeight: 1.6,
      }}>
        If this wasn't you, contact support immediately to secure your account.
      </div>

      <PrimaryBtn type="button" onClick={onRestart}>
        <span>Back to sign in</span><ArrowRight />
      </PrimaryBtn>
    </div>
  );
}

export default function ResetPassword(): React.ReactElement {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  // Replace alert + reset with router navigation
  function goToLogin() {
    setStep(0);
    setEmail("");
    navigate("/login");
  }

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
          padding: 1.5rem 1rem;
        }
        input::placeholder { color: #2d3748 !important; }
        .rp-card {
          width: 100%;
          max-width: 440px;
          background: linear-gradient(160deg, #0d1424 0%, #090f1e 100%);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.55);
        }
        @media (max-width: 480px) {
          body { padding: 0; align-items: flex-end; background: #070c18; }
          .rp-card {
            max-width: 100%;
            border-radius: 24px 24px 0 0;
            padding: 2rem 1.5rem 2.5rem;
            border-bottom: none;
          }
        }
        @media (min-width: 481px) {
          body { align-items: center; }
        }
      `}</style>

      <AuthShell>
        <div className="rp-card">
          {step === 0 && <EmailStep onNext={em => { setEmail(em); setStep(1); }} onGoToLogin={goToLogin} />}
          {step === 1 && <CheckEmailStep email={email} onBack={goToLogin} onResend={() => {}} />}
          {step === 2 && <PasswordStep email={email} onDone={() => setStep(3)} onGoToLogin={goToLogin} />}
          {step === 3 && <SuccessStep onRestart={goToLogin} />}
        </div>
      </AuthShell>
    </>
  );
}