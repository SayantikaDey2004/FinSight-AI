import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, persistAuthSession, signup as signupRequest } from "../services/authApi";

// ── Constants ──────────────────────────────────────────────────────────────
const STRENGTH_COLORS: string[] = ["#ef4444", "#f97316", "#eab308", "#34d399", "#00d4ff"];
const STRENGTH_LABELS: string[] = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];

function calcStrength(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ── Icons ──────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function XIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
interface ErrorMsgProps {
  show: boolean;
  children: ReactNode;
}

function ErrorMsg({ show, children }: ErrorMsgProps) {
  return (
    <div style={{ fontSize: 11, color: "#fb7185", marginTop: 5, display: show ? "flex" : "none", alignItems: "center", gap: 4, fontWeight: 500 }}>
      <XIcon />{children}
    </div>
  );
}

function StrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const s = calcStrength(value);
  const c = STRENGTH_COLORS[s];
  return (
    <>
      <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= s ? c : "rgba(255,255,255,.08)", transition: "background .35s" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "rgba(100,116,139,.9)", marginTop: 5 }}>
        Strength: <span style={{ color: c, fontWeight: 600 }}>{STRENGTH_LABELS[s]}</span>
      </div>
    </>
  );
}

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  hasError: boolean;
  hasOk: boolean;
  errorMsg: string;
  children?: ReactNode;
}

function InputField({ id, label, type, placeholder, autoComplete, value, onChange, onBlur, hasError, hasOk, errorMsg, children }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError ? "rgba(244,63,94,.45)" : hasOk ? "rgba(16,185,129,.35)" : focused ? "rgba(0,212,255,.4)" : "rgba(255,255,255,.08)";
  const bg = hasError ? "rgba(244,63,94,.04)" : focused ? "rgba(0,212,255,.04)" : "rgba(255,255,255,.04)";
  const shadow = focused ? "0 0 0 3px rgba(0,212,255,.08), 0 0 20px rgba(0,212,255,.06)" : "none";

  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(100,116,139,.9)", marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id} type={type} placeholder={placeholder} autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          style={{
            width: "100%", background: bg, border: `1px solid ${borderColor}`, borderRadius: 14,
            padding: children ? "12px 42px 12px 16px" : "12px 16px", fontSize: 13, color: "#fff",
            fontFamily: "Inter, sans-serif", outline: "none", transition: "all .22s",
            boxSizing: "border-box", boxShadow: shadow,
          }}
        />
        {children}
      </div>
      <ErrorMsg show={hasError}>{errorMsg}</ErrorMsg>
    </div>
  );
}

// ── Touched state type ─────────────────────────────────────────────────────
interface TouchedState {
  fullName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
  terms: boolean;
}

type SubmitState = "idle" | "loading" | "success";

// ── Orb config type ────────────────────────────────────────────────────────
interface OrbStyle {
  width: number;
  height: number;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  background: string;
  animationDuration: string;
  animationDelay?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SignUpPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPw, setShowPw] = useState<boolean>(false);
  const [showCpw, setShowCpw] = useState<boolean>(false);
  const [agreed, setAgreed] = useState<boolean>(false);
  const [touched, setTouched] = useState<TouchedState>({ fullName: false, email: false, password: false, confirmPassword: false, terms: false });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string>("");

  const nameOk = fullName.trim().length >= 2;
  const emailOk = isValidEmail(email);
  const pwOk = password.length >= 8;
  const cpwOk = password === confirmPassword && confirmPassword.length > 0;

  const errName = touched.fullName && !nameOk;
  const errEmail = touched.email && !emailOk;
  const errPw = touched.password && !pwOk;
  const errCpw = touched.confirmPassword && !cpwOk;
  const errTerms = touched.terms && !agreed;

  async function handleSubmit(): Promise<void> {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, terms: true });
    setSubmitError("");
    if (!nameOk || !emailOk || !pwOk || !cpwOk || !agreed) return;
    setSubmitState("loading");
    try {
      const result = await signupRequest({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });
      persistAuthSession(result, true);
      setSubmitState("success");
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    } catch (error) {
      setSubmitState("idle");
      setSubmitError(error instanceof ApiError ? error.message : "Unable to create the account right now. Please try again.");
    }
  }

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;800&family=Inter:wght@400;500;600&display=swap');
      @keyframes breathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes rot{to{transform:rotate(360deg)}}
      @keyframes fillBar{from{width:0}}
      .siq-submit:hover:not(:disabled){transform:translateY(-2px) scale(1.01)!important;box-shadow:0 16px 40px rgba(0,212,255,.32),0 4px 12px rgba(0,0,0,.4)!important;}
      .siq-submit:active:not(:disabled){transform:scale(.98)!important;}
      .siq-submit:disabled{opacity:.55!important;cursor:not-allowed!important;}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const G1 = "linear-gradient(135deg,#00d4ff,#7c3aed)";

  const orbs: OrbStyle[] = [
    { width: 500, height: 500, top: -120, left: -100, background: "radial-gradient(circle,rgba(0,212,255,.14),transparent 70%)", animationDuration: "9s" },
    { width: 400, height: 400, top: "30%", right: -80, background: "radial-gradient(circle,rgba(124,58,237,.18),transparent 70%)", animationDuration: "11s", animationDelay: "2s" },
    { width: 340, height: 340, bottom: -80, left: "25%", background: "radial-gradient(circle,rgba(14,165,233,.12),transparent 70%)", animationDuration: "13s", animationDelay: "5s" },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#03060f", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", overflowX: "hidden" }}>

      {/* Background orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {orbs.map((o, i) => (
          <div
            key={i}
            style={{
              position: "absolute", borderRadius: "50%", filter: "blur(100px)",
              animation: `breathe ${o.animationDuration} ease-in-out infinite ${o.animationDelay ?? "0s"}`,
              width: o.width, height: o.height,
              top: o.top, bottom: o.bottom, left: o.left, right: o.right,
              background: o.background,
            }}
          />
        ))}
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.028, backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 400, borderRadius: 28, padding: "36px 32px", background: "rgba(6,13,26,.75)", border: "1px solid rgba(255,255,255,.09)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", boxShadow: "0 40px 100px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.06)", opacity: 0, animation: "slideUp .7s ease .1s forwards", position: "relative", overflow: "hidden" }}>

        {/* Top shimmer */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(0,212,255,.4),rgba(124,58,237,.4),transparent)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: G1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(0,212,255,.3),0 6px 20px rgba(0,212,255,.2)", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L13.5 8.5H17L11.5 12.5L13.5 18.5L10 14.5L6.5 18.5L8.5 12.5L3 8.5H6.5L10 2Z" fill="white" opacity=".9" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-.5px" }}>
            FinSight<em style={{ background: G1, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "normal" }}>AI</em>
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-.5px", marginBottom: 5 }}>Create your account</div>
          <div style={{ fontSize: 13, color: "rgba(100,116,139,.9)", lineHeight: 1.5 }}>
            Free for 14 days · <strong style={{ color: "rgba(148,163,184,.8)", fontWeight: 500 }}>No credit card required</strong>
          </div>
        </div>

        {/* Success banner */}
        {submitState === "success" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(16,185,129,.25)", background: "rgba(16,185,129,.08)", marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(16,185,129,.35)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Account created! 🎉</div>
              <div style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>Check your inbox to verify your email.</div>
            </div>
          </div>
        )}

        {submitError && (
          <div style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(244,63,94,.25)", background: "rgba(244,63,94,.08)", marginBottom: 18, color: "#fecdd3", fontSize: 12, lineHeight: 1.5 }}>
            {submitError}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14, opacity: submitState === "success" ? 0.4 : 1, pointerEvents: submitState === "success" ? "none" : "auto", transition: "opacity .3s" }}>
          <InputField id="fn" label="Full Name" type="text" placeholder="Jane Doe" autoComplete="name"
            value={fullName} onChange={setFullName} onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            hasError={errName} hasOk={!errName && fullName.length > 0 && nameOk} errorMsg="Enter your full name" />

          <InputField id="em" label="Email Address" type="email" placeholder="jane@company.com" autoComplete="email"
            value={email} onChange={setEmail} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            hasError={errEmail} hasOk={!errEmail && email.length > 0 && emailOk} errorMsg="Enter a valid email address" />

          <InputField id="pw" label="Password" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password"
            value={password} onChange={setPassword} onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            hasError={errPw} hasOk={!errPw && password.length > 0 && pwOk} errorMsg="Password must be at least 8 characters">
            <button type="button" onClick={() => setShowPw((v) => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(100,116,139,.8)", display: "flex", alignItems: "center", transition: "color .2s" }}>
              <EyeIcon />
            </button>
          </InputField>

          {password && <StrengthMeter value={password} />}

          <InputField id="cpw" label="Confirm Password" type={showCpw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password"
            value={confirmPassword} onChange={setConfirmPassword} onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            hasError={errCpw} hasOk={!errCpw && confirmPassword.length > 0 && cpwOk} errorMsg="Passwords do not match">
            <button type="button" onClick={() => setShowCpw((v) => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(100,116,139,.8)", display: "flex", alignItems: "center", transition: "color .2s" }}>
              <EyeIcon />
            </button>
          </InputField>
        </div>

        {/* Terms */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <input type="checkbox" id="tc" checked={agreed}
            onChange={(e) => { setAgreed(e.target.checked); setTouched((t) => ({ ...t, terms: true })); }}
            style={{ width: 17, height: 17, borderRadius: 6, cursor: "pointer", flexShrink: 0, marginTop: 1, accentColor: "#00d4ff" }} />
          <label htmlFor="tc" style={{ fontSize: 12, color: "rgba(100,116,139,.85)", lineHeight: 1.6 }}>
            I agree to the{" "}
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#00d4ff", textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)" }}>Terms of Service</a>{" "}
            and{" "}
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#00d4ff", textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)" }}>Privacy Policy</a>.
            {" "}I understand my data is encrypted and never sold.
          </label>
        </div>
        <ErrorMsg show={errTerms}>Please accept the terms to continue</ErrorMsg>

        {/* Submit */}
        <button
          type="button"
          className="siq-submit"
          disabled={submitState !== "idle"}
          onClick={handleSubmit}
          style={{
            width: "100%", padding: 14, borderRadius: 16, border: "none",
            background: submitState === "success" ? "linear-gradient(135deg,#10b981,#34d399)" : G1,
            color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Bricolage Grotesque',sans-serif",
            letterSpacing: ".3px", cursor: submitState !== "idle" ? "not-allowed" : "pointer",
            transition: "all .25s", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            boxShadow: submitState === "success" ? "0 8px 24px rgba(16,185,129,.3)" : "0 8px 24px rgba(0,212,255,.2),0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)",
            marginTop: 16, marginBottom: 4,
          }}
        >
          {submitState === "idle" && (
            <><span>Create Account</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg></>
          )}
          {submitState === "loading" && (
            <><div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "rot .65s linear infinite" }} /><span>Creating account…</span></>
          )}
          {submitState === "success" && (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12" /></svg><span>Account created!</span></>
          )}
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "rgba(100,116,139,.8)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#00d4ff", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)", paddingBottom: 1 }}>
            Sign in →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, fontSize: 11, color: "rgba(51,65,85,.7)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        256-bit AES encrypted
        <span style={{ color: "rgba(51,65,85,.5)" }}>·</span>
        SOC 2 Type II
        <span style={{ color: "rgba(51,65,85,.5)" }}>·</span>
        GDPR compliant
      </div>
    </div>
  );
}