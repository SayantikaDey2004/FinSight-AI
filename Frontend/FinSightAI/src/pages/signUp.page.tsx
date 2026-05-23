import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ApiError, persistAuthSession, signup as signupRequest } from "../services/authApi";

// ── Types ──────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

// ── Constants ──────────────────────────────────────────────────────────────
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#34d399", "#00d4ff"];
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];

function calcStrength(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ── Particle Canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let pts: Particle[] = [];
    let W = 0, H = 0;

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W;
      canvas!.height = H;
      pts = Array.from({ length: 55 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(0,212,255,.25)";
        ctx!.fill();
      });
      pts.forEach((a, i) => {
        pts.forEach((b, j) => {
          if (j <= i) return;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `rgba(0,212,255,${0.06 * (1 - d / 100)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

// ── FloatingCard ───────────────────────────────────────────────────────────
function FloatingCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 5,
    borderRadius: 16,
    padding: "12px 16px",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    background: "rgba(6,13,26,.7)",
    border: "1px solid rgba(255,255,255,.1)",
    boxShadow: "0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)",
  };
  return (
    <div className={className} style={{ ...baseStyle, ...(style || {}) }}>
      {children}
    </div>
  );
}

// ── EyeIcon ────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── XIcon ──────────────────────────────────────────────────────────────────
function XIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ── ErrorMsg ───────────────────────────────────────────────────────────────
function ErrorMsg({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "#fb7185",
        marginTop: 5,
        display: show ? "flex" : "none",
        alignItems: "center",
        gap: 4,
        fontWeight: 500,
      }}
    >
      <XIcon />
      {children}
    </div>
  );
}

// ── StrengthMeter ──────────────────────────────────────────────────────────
function StrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const s = calcStrength(value);
  const c = STRENGTH_COLORS[s];
  return (
    <>
      <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              background: i <= s ? c : "rgba(255,255,255,.08)",
              transition: "background .35s",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "rgba(71,85,105,.9)", marginTop: 5 }}>
        Strength:{" "}
        <span style={{ color: c, fontWeight: 600 }}>{STRENGTH_LABELS[s]}</span>
      </div>
    </>
  );
}

// ── InputField ─────────────────────────────────────────────────────────────
function InputField({
  id,
  label,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
  onBlur,
  hasError,
  hasOk,
  errorMsg,
  children,
}: {
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
  children?: React.ReactNode;
}) {
  const borderColor = hasError
    ? "rgba(244,63,94,.45)"
    : hasOk
    ? "rgba(16,185,129,.35)"
    : "rgba(255,255,255,.08)";
  const bg = hasError ? "rgba(244,63,94,.04)" : hasOk ? undefined : "rgba(255,255,255,.04)";

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "rgba(71,85,105,.9)",
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{
            width: "100%",
            background: bg ?? "rgba(255,255,255,.04)",
            border: `1px solid ${borderColor}`,
            borderRadius: 14,
            padding: children ? "12px 42px 12px 16px" : "12px 16px",
            fontSize: 13,
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            outline: "none",
            transition: "all .22s",
            letterSpacing: ".01em",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,212,255,.4)";
            e.currentTarget.style.background = "rgba(0,212,255,.04)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(0,212,255,.08), 0 0 20px rgba(0,212,255,.06)";
          }}
        />
        {children}
      </div>
      <ErrorMsg show={hasError}>{errorMsg}</ErrorMsg>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function FinSightAISignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
    terms: false,
  });

  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success">("idle");
  const [submitError, setSubmitError] = useState("");

  const nameOk = fullName.trim().length >= 2;
  const emailOk = isValidEmail(email);
  const pwOk = password.length >= 8;
  const cpwOk = password === confirmPassword && confirmPassword.length > 0;
  const termsOk = agreed;

  const errName = touched.fullName && !nameOk;
  const errEmail = touched.email && !emailOk;
  const errPw = touched.password && !pwOk;
  const errCpw = touched.confirmPassword && !cpwOk;
  const errTerms = touched.terms && !termsOk;

  async function handleSubmit() {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, terms: true });
    setSubmitError("");
    if (!nameOk || !emailOk || !pwOk || !cpwOk || !termsOk) return;
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

  // ── CSS keyframes injected once ───────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
      @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.18);opacity:1}}
      @keyframes ping{0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,.4)}50%{box-shadow:0 0 0 8px rgba(0,212,255,0)}}
      @keyframes floatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes shimmer{0%,100%{left:-60%}50%{left:120%}}
      @keyframes rot{to{transform:rotate(360deg)}}
      @keyframes fillBar{from{width:0}}
      .siq-feat:hover{border-color:rgba(0,212,255,.2)!important;transform:translateX(3px)!important;}
      .siq-feat:hover .siq-feat-before{opacity:1!important;}
      .siq-feat:hover .siq-farr{color:#00d4ff!important;transform:translateX(2px)!important;}
      .siq-sbtn:hover{border-color:rgba(255,255,255,.15)!important;color:#fff!important;transform:translateY(-1px)!important;}
      .siq-submit:hover:not(:disabled){transform:translateY(-2px) scale(1.01)!important;box-shadow:0 16px 40px rgba(0,212,255,.32),0 4px 12px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.2)!important;}
      .siq-submit:active:not(:disabled){transform:scale(.98)!important;}
      .siq-submit:disabled{opacity:.55!important;cursor:not-allowed!important;transform:none!important;}
      @media(max-width:820px){.siq-left{display:none!important}.siq-right{width:100%!important;border:none!important}}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const G1 = "linear-gradient(135deg,#00d4ff,#7c3aed)";

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#03060f",
        color: "#fff",
        minHeight: "100vh",
        overflowX: "hidden",
        position: "relative",
        display: "flex",
      }}
    >
      {/* ── Canvas BG ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Orbs */}
        {[
          { style: { width: 500, height: 500, top: -120, left: -100, background: "radial-gradient(circle,rgba(0,212,255,.14),transparent 70%)", animation: "breathe 9s ease-in-out infinite" } },
          { style: { width: 400, height: 400, top: "30%", right: -80, background: "radial-gradient(circle,rgba(124,58,237,.18),transparent 70%)", animation: "breathe 11s ease-in-out infinite 2s" } },
          { style: { width: 340, height: 340, bottom: -80, left: "25%", background: "radial-gradient(circle,rgba(14,165,233,.12),transparent 70%)", animation: "breathe 13s ease-in-out infinite 5s" } },
          { style: { width: 200, height: 200, top: "50%", left: "40%", background: "radial-gradient(circle,rgba(168,85,247,.1),transparent 70%)", animation: "breathe 7s ease-in-out infinite 1s" } },
        ].map((o, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50%",
              filter: "blur(100px)",
              pointerEvents: "none",
              ...o.style,
            } as React.CSSProperties}
          />
        ))}
        {/* Grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.028,
            backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <ParticleCanvas />
      </div>

      {/* ── LEFT ── */}
      <div
        className="siq-left"
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
          overflow: "hidden",
        }}
      >
        {/* Floating Cards */}
        <FloatingCard style={{ top: "5%", right: "5%", animation: "floatA 5s ease-in-out infinite" } as React.CSSProperties}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff" }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(100,116,139,.8)" }}>Health Score</span>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            782<span style={{ fontSize: 13, color: "rgba(148,163,184,.6)", fontFamily: "Inter" }}>/850</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: "#34d399" }}>↑ Excellent standing</div>
          <div style={{ height: 3, borderRadius: 2, marginTop: 10, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ width: "92%", height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#00d4ff,#10b981)", animation: "fillBar 1.5s ease .5s both" }} />
          </div>
        </FloatingCard>

        <FloatingCard style={{ bottom: "22%", left: "3%", animation: "floatB 6s ease-in-out infinite .5s" } as React.CSSProperties}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(100,116,139,.8)" }}>Monthly Savings</span>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>$2,847</div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: "#34d399" }}>↑ 12.4% vs last month</div>
          <div style={{ height: 3, borderRadius: 2, marginTop: 10, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ width: "68%", height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#10b981,#00d4ff)", animation: "fillBar 1.5s ease .5s both" }} />
          </div>
        </FloatingCard>

        <FloatingCard style={{ bottom: "10%", right: "6%", animation: "floatA 7s ease-in-out infinite 1s" } as React.CSSProperties}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7" }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(100,116,139,.8)" }}>AI Insights</span>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            23 <span style={{ fontSize: 13, color: "rgba(148,163,184,.6)", fontFamily: "Inter" }}>new</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: "#a78bfa" }}>Generated this week</div>
        </FloatingCard>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 460, width: "100%" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36, opacity: 0, animation: "slideUp .7s ease .1s forwards" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: G1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 1px rgba(0,212,255,.3),0 8px 32px rgba(0,212,255,.25)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ position: "relative", zIndex: 1 }}>
                <path d="M10 2L13.5 8.5H17L11.5 12.5L13.5 18.5L10 14.5L6.5 18.5L8.5 12.5L3 8.5H6.5L10 2Z" fill="white" opacity=".9" />
              </svg>
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", color: "#fff" }}>
              FinSight<em style={{ background: G1, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "normal" }}>AI</em>
            </div>
            <div style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 6, background: "rgba(0,212,255,.12)", border: "1px solid rgba(0,212,255,.2)", color: "#00d4ff", textTransform: "uppercase", fontFamily: "Inter,sans-serif" }}>
              Beta
            </div>
          </div>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, opacity: 0, animation: "slideUp .7s ease .25s forwards" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d4ff", animation: "ping 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#00d4ff" }}>AI-Powered Financial Intelligence</span>
          </div>

          {/* H1 */}
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 42, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", color: "#fff", marginBottom: 18, opacity: 0, animation: "slideUp .7s ease .35s forwards" }}>
            Turn bank statements<br />
            into{" "}
            <span style={{ background: "linear-gradient(100deg,#00d4ff 0%,#818cf8 50%,#a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              clarity.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(148,163,184,.8)", lineHeight: 1.7, marginBottom: 36, fontWeight: 400, opacity: 0, animation: "slideUp .7s ease .45s forwards" }}>
            Upload any statement. Our AI categorizes every transaction, computes your financial health score, and surfaces insights you'd never find manually.
          </p>

          {/* Stats */}
          <div style={{ display: "flex", marginBottom: 36, opacity: 0, animation: "slideUp .7s ease .55s forwards", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.02)" }}>
            {[
              { val: "2.4M+", lbl: "Transactions analyzed" },
              { val: "98%", lbl: "Categorization accuracy" },
              { val: "14 days", lbl: "Free trial" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "14px 18px", borderRight: i < 2 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  <span style={{ background: G1, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.val}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(100,116,139,.9)", marginTop: 4, fontWeight: 500, letterSpacing: ".02em" }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0, animation: "slideUp .7s ease .65s forwards" }}>
            {[
              {
                iconBg: "rgba(0,212,255,.1)", iconBorder: "rgba(0,212,255,.2)",
                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>,
                name: "AI Transaction Categorization", desc: "GPT-4 powered engine tags every line item in seconds",
              },
              {
                iconBg: "rgba(124,58,237,.1)", iconBorder: "rgba(124,58,237,.2)",
                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>,
                name: "Smart Spending Insights", desc: "Predictive trend alerts before you overspend",
              },
              {
                iconBg: "rgba(16,185,129,.1)", iconBorder: "rgba(16,185,129,.2)",
                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>,
                name: "Financial Health Score", desc: "Real-time 0–850 wellness rating, refreshed daily",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="siq-feat"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.055)",
                  background: "rgba(255,255,255,.02)",
                  cursor: "default",
                  transition: "all .25s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: f.iconBg, border: `1px solid ${f.iconBorder}` }}>
                  {f.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-.2px" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(100,116,139,.9)", marginTop: 2 }}>{f.desc}</div>
                </div>
                <div className="siq-farr" style={{ fontSize: 14, color: "rgba(100,116,139,.5)", transition: "all .25s", marginLeft: 4 }}>›</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div
        className="siq-right"
        style={{
          width: 460,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 36px",
          borderLeft: "1px solid rgba(255,255,255,.04)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 28,
            padding: "36px 32px",
            background: "rgba(6,13,26,.6)",
            border: "1px solid rgba(255,255,255,.09)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 40px 100px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.06)",
            opacity: 0,
            animation: "slideUp .7s ease .2s forwards",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top shimmer line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(0,212,255,.4),rgba(124,58,237,.4),transparent)" }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-.5px", marginBottom: 5 }}>Create your account</div>
            <div style={{ fontSize: 13, color: "rgba(100,116,139,.9)", lineHeight: 1.5 }}>
              Free for 14 days · <strong style={{ color: "rgba(148,163,184,.8)", fontWeight: 500 }}>No credit card required</strong>
            </div>
          </div>

          {/* Social buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                ),
                label: "Continue with Google",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                ),
                label: "Continue with GitHub",
              },
            ].map((btn, i) => (
              <button
                key={i}
                className="siq-sbtn"
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 11,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.03)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(203,213,225,.9)",
                  cursor: "pointer",
                  transition: "all .2s",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.07)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(71,85,105,.9)" }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.07)" }} />
          </div>

          {/* Success banner */}
          {submitState === "success" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(16,185,129,.25)", background: "rgba(16,185,129,.08)", marginBottom: 18, animation: "slideUp .3s ease" }}>
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 14,
              opacity: submitState === "success" ? 0.4 : 1,
              pointerEvents: submitState === "success" ? "none" : "auto",
              transition: "opacity .3s",
            }}
          >
            <InputField
              id="fn" label="Full Name" type="text" placeholder="Jane Doe" autoComplete="name"
              value={fullName} onChange={setFullName}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              hasError={errName} hasOk={!errName && fullName.length > 0 && nameOk}
              errorMsg="Enter your full name"
            />
            <InputField
              id="em" label="Email Address" type="email" placeholder="jane@company.com" autoComplete="email"
              value={email} onChange={setEmail}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              hasError={errEmail} hasOk={!errEmail && email.length > 0 && emailOk}
              errorMsg="Enter a valid email address"
            />
            <InputField
              id="pw" label="Password" type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password"
              value={password} onChange={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              hasError={errPw} hasOk={!errPw && password.length > 0 && pwOk}
              errorMsg="Password must be at least 8 characters"
            >
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(71,85,105,.8)", display: "flex", alignItems: "center", transition: "color .2s" }}
              >
                <EyeIcon />
              </button>
            </InputField>
            {password && <StrengthMeter value={password} />}
            <InputField
              id="cpw" label="Confirm Password" type={showCpw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password"
              value={confirmPassword} onChange={setConfirmPassword}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              hasError={errCpw} hasOk={!errCpw && confirmPassword.length > 0 && cpwOk}
              errorMsg="Passwords do not match"
            >
              <button
                type="button"
                onClick={() => setShowCpw((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(71,85,105,.8)", display: "flex", alignItems: "center", transition: "color .2s" }}
              >
                <EyeIcon />
              </button>
            </InputField>
          </div>

          {/* Terms */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <input
              type="checkbox"
              id="tc"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setTouched((t) => ({ ...t, terms: true })); }}
              style={{ width: 17, height: 17, borderRadius: 6, border: "1.5px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", cursor: "pointer", flexShrink: 0, marginTop: 1, accentColor: "#00d4ff" }}
            />
            <label htmlFor="tc" style={{ fontSize: 12, color: "rgba(100,116,139,.85)", lineHeight: 1.6 }}>
              I agree to the{" "}
              <a href="#" style={{ color: "#00d4ff", textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)" }}>Terms of Service</a>{" "}
              and{" "}
              <a href="#" style={{ color: "#00d4ff", textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)" }}>Privacy Policy</a>.
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
              width: "100%",
              padding: 14,
              borderRadius: 16,
              border: "none",
              background: submitState === "success" ? "linear-gradient(135deg,#10b981,#34d399)" : G1,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Bricolage Grotesque',sans-serif",
              letterSpacing: ".3px",
              cursor: submitState !== "idle" ? "not-allowed" : "pointer",
              transition: "all .25s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              boxShadow: submitState === "success"
                ? "0 8px 24px rgba(16,185,129,.3)"
                : "0 8px 24px rgba(0,212,255,.2),0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)",
              position: "relative",
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {submitState === "idle" && (
              <>
                <span>Create Account</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </>
            )}
            {submitState === "loading" && (
              <>
                <div style={{ width: 17, height: 17, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "rot .65s linear infinite" }} />
                <span>Creating account…</span>
              </>
            )}
            {submitState === "success" && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12" /></svg>
                <span>Account created!</span>
              </>
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(71,85,105,.8)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#00d4ff", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,.3)", paddingBottom: 1 }}>
              Sign in →
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: "rgba(51,65,85,.8)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          256-bit AES encrypted
          <span style={{ color: "rgba(51,65,85,.5)" }}>·</span>
          SOC 2 Type II
          <span style={{ color: "rgba(51,65,85,.5)" }}>·</span>
          GDPR compliant
        </div>
      </div>
    </div>
  );
}
