import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Zap, PieChart,
} from "lucide-react";
import { ApiError, login as loginRequest, persistAuthSession } from "../services/authApi";

// ── Types ──────────────────────────────────────────────────────────────────
interface FormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface GlassInputProps {
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

// ── GlassInput ─────────────────────────────────────────────────────────────
const GlassInput: React.FC<GlassInputProps> = ({
  id, label, type, value, onChange, error, icon, placeholder, rightElement, autoComplete,
}) => {
  const [focused, setFocused] = useState<boolean>(false);

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="w-full pl-11 pr-11 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all duration-200"
          style={{
            background: focused ? "rgba(30,41,59,0.9)" : "rgba(15,23,42,0.6)",
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
        />
        {rightElement && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
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

// ── LoginPage ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
      setLoginSuccess(false);
      setSubmitError(error instanceof ApiError ? error.message : "Unable to sign in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(15,23,56,1) 0%, rgba(7,11,28,1) 60%, rgba(4,6,18,1) 100%)",
      }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute" style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.07) 0%, transparent 70%)", top: "-150px", left: "-100px" }} />
        <div className="absolute" style={{ width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", bottom: "-80px", right: "-80px" }} />
        <div className="absolute" style={{ width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      </div>

      <motion.div
        className="w-full max-w-[420px] relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8 justify-center">
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
            background: "rgba(15,23,42,0.75)",
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
                    onChange={(v: string) => {
                      setField("email", v);
                      if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                    }}
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
                    onChange={(v: string) => {
                      setField("password", v);
                      if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                    }}
                    error={errors.password}
                    icon={<Lock className="w-4 h-4" />}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="text-slate-500 hover:text-slate-300 transition-colors duration-150 rounded"
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
                      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
                        e.key === " " && setField("rememberMe", !form.rememberMe)
                      }
                    >
                      {form.rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                      Remember me
                    </span>
                  </label>
                  <a
                    href="#"
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-150 rounded"
                  >
                    Forgot password?
                  </a>
                </motion.div>

                {/* Submit */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.015 }}
                    whileTap={{ scale: isLoading ? 1 : 0.975 }}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 relative overflow-hidden transition-opacity duration-200"
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
                  >
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

                <motion.p variants={itemVariants} className="text-center text-sm text-slate-500">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-150 rounded"
                  >
                    Create Account
                  </Link>
                </motion.p>

                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-1">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
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
        <motion.p variants={itemVariants} className="text-center text-xs text-slate-600 mt-6 space-x-3">
          <a href="#" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Terms of Service</a>
          <span>·</span>
          <a href="#" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()} className="hover:text-slate-400 transition-colors">Security</a>
        </motion.p>
      </motion.div>
    </div>
  );
}