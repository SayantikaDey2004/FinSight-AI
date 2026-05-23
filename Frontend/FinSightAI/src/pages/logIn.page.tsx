import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Brain,
  Activity,
  Sparkles,
  BarChart3,
  Wallet,
  PieChart,
} from "lucide-react";
import { ApiError, login as loginRequest, persistAuthSession } from "../services/authApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface FloatingCard {
  id: number;
  x: number;
  y: number;
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  delay: number;
}

interface ConnectionLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  animated: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COLORS = [
  "rgba(96,165,250,0.8)",
  "rgba(139,92,246,0.8)",
  "rgba(34,211,238,0.8)",
  "rgba(167,243,208,0.5)",
];

const FEATURES = [
  {
    icon: <Brain className="w-5 h-5" />,
    label: "AI Transaction Categorization",
    sub: "GPT-powered auto-tagging",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    label: "Smart Spending Analytics",
    sub: "Predictive trend forecasting",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    label: "Financial Health Insights",
    sub: "Real-time risk scoring",
  },
];

// ─── Particle Canvas ──────────────────────────────────────────────────────────

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const linesRef = useRef<ConnectionLine[]>([]);
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    particlesRef.current = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.7 + 0.2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = particlesRef.current;

      // update positions
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // draw connection lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      // draw particles
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // occasional data pulse lines
      if (frameRef.current % 120 === 0) {
        const src = pts[Math.floor(Math.random() * pts.length)];
        const dst = pts[Math.floor(Math.random() * pts.length)];
        linesRef.current.push({
          id: Date.now(),
          x1: src.x, y1: src.y,
          x2: dst.x, y2: dst.y,
          opacity: 1,
          animated: true,
        });
      }

      // draw pulse lines
      linesRef.current = linesRef.current.filter((l) => l.opacity > 0);
      linesRef.current.forEach((l) => {
        l.opacity -= 0.015;
        ctx.beginPath();
        const grad = ctx.createLinearGradient(l.x1, l.y1, l.x2, l.y2);
        grad.addColorStop(0, `rgba(139,92,246,${l.opacity * 0.8})`);
        grad.addColorStop(1, `rgba(34,211,238,${l.opacity * 0.4})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.75 }}
    />
  );
};

// ─── Floating Analytics Card ──────────────────────────────────────────────────

const FloatingCard: React.FC<FloatingCard> = ({ x, y, title, value, change, positive, icon, delay }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0.7, y: 20 }}
    animate={{
      opacity: [0.75, 1, 0.75],
      y: [0, -10, 0],
      scale: [1, 1.02, 1],
    }}
    transition={{
      opacity: { duration: 3, repeat: Infinity, delay },
      y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
      scale: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
      default: { delay: delay + 0.5 },
    }}
  >
    <div
      className="rounded-2xl px-4 py-3 text-left min-w-[160px]"
      style={{
        background: "rgba(15,23,42,0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(96,165,250,0.18)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-blue-400">{icon}</span>
        <span className="text-xs text-slate-400 font-medium tracking-wide">{title}</span>
      </div>
      <div className="text-white font-bold text-lg leading-none">{value}</div>
      <div className={`text-xs mt-1 font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        {change}
      </div>
    </div>
  </motion.div>
);

// ─── Category Bubble ──────────────────────────────────────────────────────────

interface BubbleProps { label: string; pct: number; color: string; delay: number; x: number; y: number; }

const CategoryBubble: React.FC<BubbleProps> = ({ label, pct, color, delay, x, y }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0.6, 0.9, 0.6], scale: [1, 1.08, 1], y: [0, -6, 0] }}
    transition={{ opacity: { duration: 3.5, repeat: Infinity, delay }, scale: { duration: 3.5, repeat: Infinity, delay }, y: { duration: 3.5, repeat: Infinity, delay }, default: { delay: delay + 1 } }}
  >
    <div
      className="rounded-full flex flex-col items-center justify-center"
      style={{
        width: 72,
        height: 72,
        background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}11)`,
        border: `1.5px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33`,
      }}
    >
      <span className="text-white text-xs font-bold">{pct}%</span>
      <span className="text-slate-300 text-[9px] text-center leading-tight px-1">{label}</span>
    </div>
  </motion.div>
);

// ─── Input Field ──────────────────────────────────────────────────────────────

interface InputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  icon: React.ReactNode;
  placeholder: string;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

const GlassInput: React.FC<InputProps> = ({
  id, label, type, value, onChange, error, icon, placeholder, rightElement, autoComplete,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300 tracking-wide">
        {label}
      </label>
      <div className="relative">
        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused ? "text-blue-400" : "text-slate-500"}`}>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-11 pr-11 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all duration-200"
          style={{
            background: focused
              ? "rgba(30,41,59,0.9)"
              : "rgba(15,23,42,0.6)",
            border: error
              ? "1.5px solid rgba(248,113,113,0.6)"
              : focused
              ? "1.5px solid rgba(96,165,250,0.7)"
              : "1.5px solid rgba(71,85,105,0.4)",
            boxShadow: focused
              ? "0 0 0 3px rgba(96,165,250,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {rightElement && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-rose-400 flex items-center gap-1"
          >
            <span className="inline-block w-1 h-1 rounded-full bg-rose-400" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main LoginPage ───────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setIsLoading(true);
    try {
      const result = await loginRequest({
        email: form.email.trim(),
        password: form.password,
      });
      persistAuthSession(result, form.rememberMe);
      setLoginSuccess(true);
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to sign in right now. Please try again.");
      }
      setIsLoading(false);
    }
  };

  // Framer Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes siqPageRise{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes siqOrbFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-10px,0)}}
      @keyframes siqGlowPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
      .siq-page-rise{animation:siqPageRise .7s cubic-bezier(.22,1,.36,1) both;}
      .siq-orb{animation:siqOrbFloat 10s ease-in-out infinite;}
      .siq-orb-alt{animation:siqOrbFloat 12s ease-in-out infinite 2s;}
      .siq-glow{animation:siqGlowPulse 7s ease-in-out infinite;}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const floatingCards: FloatingCard[] = [
    { id: 1, x: 5, y: 12, title: "Portfolio Value", value: "$284,920", change: "+4.7% this week", positive: true, icon: <Wallet className="w-4 h-4" />, delay: 0 },
    { id: 2, x: 60, y: 6, title: "Monthly Spend", value: "$3,241", change: "-12% vs last mo.", positive: true, icon: <BarChart3 className="w-4 h-4" />, delay: 0.6 },
    { id: 3, x: 8, y: 62, title: "AI Score", value: "92 / 100", change: "↑ Excellent health", positive: true, icon: <Sparkles className="w-4 h-4" />, delay: 1.2 },
    { id: 4, x: 55, y: 72, title: "Investments", value: "+18.3%", change: "YTD return", positive: true, icon: <TrendingUp className="w-4 h-4" />, delay: 0.9 },
    { id: 5, x: 30, y: 82, title: "Cash Flow", value: "$1,840", change: "Net positive", positive: true, icon: <Activity className="w-4 h-4" />, delay: 1.5 },
  ];

  const bubbles: BubbleProps[] = [
    { label: "Housing", pct: 32, color: "#60a5fa", delay: 0.3, x: 72, y: 30 },
    { label: "Food", pct: 18, color: "#a78bfa", delay: 0.7, x: 20, y: 40 },
    { label: "Transport", pct: 14, color: "#34d399", delay: 1.1, x: 78, y: 55 },
    { label: "Health", pct: 11, color: "#f472b6", delay: 1.4, x: 40, y: 20 },
  ];

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden relative font-sans"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(15,23,56,1) 0%, rgba(7,11,28,1) 60%, rgba(4,6,18,1) 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute siq-orb"
          style={{
            width: 700, height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)",
            top: "-200px", left: "-150px",
          }}
        />
        <div
          className="absolute siq-orb-alt"
          style={{
            width: 500, height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
            bottom: "-100px", left: "30%",
          }}
        />
        <div
          className="absolute siq-glow"
          style={{
            width: 400, height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)",
            top: "20%", left: "40%",
          }}
        />
      </div>

      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <div className={`hidden lg:flex flex-1 relative flex-col justify-between px-16 py-12 overflow-hidden ${mounted ? "siq-page-rise" : ""}`}>
        <ParticleCanvas />
        {floatingCards.map((c) => <FloatingCard key={c.id} {...c} />)}
        {bubbles.map((b, i) => <CategoryBubble key={i} {...b} />)}

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 0 24px rgba(96,165,250,0.45)",
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(90deg, #e2e8f0, #94a3b8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FinSightAI
            </span>
          </div>
          <h1
            className="text-5xl xl:text-6xl font-extrabold leading-none tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #60a5fa 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Turn Transactions<br />Into Intelligence.
          </h1>
          <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
            AI-powered financial clarity. See where every dollar goes — and where it should go next.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative z-10 space-y-3"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              className="flex items-center gap-4 group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                style={{
                  background: "rgba(96,165,250,0.12)",
                  border: "1px solid rgba(96,165,250,0.2)",
                  boxShadow: "0 0 12px rgba(96,165,250,0.1)",
                }}
              >
                <span className="text-blue-400">{f.icon}</span>
              </div>
              <div>
                <div className="text-slate-200 font-semibold text-sm">{f.label}</div>
                <div className="text-slate-500 text-xs">{f.sub}</div>
              </div>
            </motion.div>
          ))}

          {/* Bottom badge */}
          <div className="pt-4 flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">SOC 2 Type II · 256-bit AES Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative z-10">
        <motion.div
          className={`w-full max-w-[420px] ${mounted ? "siq-page-rise" : ""}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile brand */}
          <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 20px rgba(96,165,250,0.4)" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">FinSightAI</span>
          </motion.div>

          {/* Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl p-8 sm:p-9"
            style={{
              background: "rgba(15,23,42,0.7)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(96,165,250,0.14)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <AnimatePresence mode="wait">
              {loginSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 gap-4 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}
                  >
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Welcome back!</h2>
                  <p className="text-slate-400 text-sm">Redirecting to your dashboard…</p>
                  <motion.div className="w-32 h-1 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                    />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex flex-col gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Header */}
                  <motion.div variants={itemVariants} className="mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PieChart className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-blue-400 font-semibold tracking-widest uppercase">
                        Secure Access
                      </span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Sign in</h2>
                    <p className="text-slate-400 text-sm mt-1">to your financial intelligence hub</p>
                  </motion.div>

                  {submitError && (
                    <motion.div
                      variants={itemVariants}
                      className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                      role="alert"
                    >
                      {submitError}
                    </motion.div>
                  )}

                  {/* Email */}
                  <motion.div variants={itemVariants}>
                    <GlassInput
                      id="email"
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={(v) => { setField("email", v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                      error={errors.email}
                      icon={<Mail className="w-4 h-4" />}
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  </motion.div>

                  {/* Password */}
                  <motion.div variants={itemVariants}>
                    <GlassInput
                      id="password"
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(v) => { setField("password", v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                      error={errors.password}
                      icon={<Lock className="w-4 h-4" />}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="text-slate-500 hover:text-slate-300 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </motion.div>

                  {/* Remember + Forgot */}
                  <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="remember"
                          checked={form.rememberMe}
                          onChange={(e) => setField("rememberMe", e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                          style={{
                            background: form.rememberMe ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "rgba(30,41,59,0.8)",
                            border: form.rememberMe ? "none" : "1.5px solid rgba(71,85,105,0.5)",
                            boxShadow: form.rememberMe ? "0 0 10px rgba(96,165,250,0.35)" : "none",
                          }}
                          onClick={() => setField("rememberMe", !form.rememberMe)}
                          role="checkbox"
                          aria-checked={form.rememberMe}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === " " && setField("rememberMe", !form.rememberMe)}
                        >
                          {form.rememberMe && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
                    >
                      Forgot password?
                    </Link>
                  </motion.div>

                  {/* Submit */}
                  <motion.div variants={itemVariants}>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.015 }}
                      whileTap={{ scale: isLoading ? 1 : 0.975 }}
                      className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 relative overflow-hidden transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                      style={{
                        background: isLoading
                          ? "linear-gradient(135deg,#1e40af,#5b21b6)"
                          : "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                        boxShadow: isLoading
                          ? "none"
                          : "0 0 32px rgba(96,165,250,0.35), 0 8px 24px rgba(96,165,250,0.2)",
                        opacity: isLoading ? 0.8 : 1,
                      }}
                      aria-busy={isLoading}
                      aria-disabled={isLoading}
                    >
                      {/* shimmer */}
                      {!isLoading && (
                        <motion.div
                          className="absolute inset-0 -skew-x-12"
                          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                      {isLoading ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                          <span>Authenticating…</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </motion.div>

                  {/* Sign Up */}
                  <motion.p variants={itemVariants} className="text-center text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
                    >
                      Create Account
                    </Link>
                  </motion.p>

                  {/* Trust indicators */}
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-center gap-2 pt-1"
                  >
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        background: "rgba(16,185,129,0.07)",
                        border: "1px solid rgba(16,185,129,0.15)",
                      }}
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px] font-medium">Encrypted & Secure Login</span>
                    </div>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-slate-600 mt-6 space-x-3"
          >
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Security</a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;