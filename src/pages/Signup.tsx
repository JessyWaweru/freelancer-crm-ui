import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { login } from "../auth";
import AuthShell from "@/components/AuthShell";
import { errorText } from "@/lib/format";

/* Password must have lower + upper case and a digit or symbol, 8+ chars. */
function validatePassword(pw: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/.test(pw);
}

function strengthScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[\d\W]/.test(pw)) score++;
  return Math.min(score, 4);
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["#e5d6cf", "#b42318", "#e8a83b", "#c0456b", "#1f7a4d"];

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const strength = password ? strengthScore(password) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) return setError("Pick a username.");
    if (!validatePassword(password)) {
      return setError("Use at least 8 characters with upper and lower case letters and a number or symbol.");
    }
    setLoading(true);
    try {
      await api.post("/register/", { username: username.trim(), password });
      try {
        await login(username.trim(), password);
        nav("/app/settings");
      } catch {
        nav("/login");
      }
    } catch (err) {
      setError(errorText(err, "Sign up failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Free. Takes less than a minute.">
      <form onSubmit={onSubmit} className="grid gap-4">
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} className="text-sm text-destructive bg-[#fdecea] rounded-xl p-3">
            {error}
          </motion.p>
        )}
        <label className="field">
          <span className="field-label">Username</span>
          <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <div className="relative">
            <input className="input !pr-11" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Choose a strong password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
            <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn !h-9 !w-9" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <motion.span key={i} className="h-1.5 flex-1 rounded-full" animate={{ backgroundColor: strength >= i ? COLORS[strength] : "#eee1da" }} />
            ))}
          </div>
          <span className="field-hint">{password ? LABELS[strength] : "8+ characters, mixed case, plus a number or symbol"}</span>
        </label>
        <button type="submit" className="btn btn-primary w-full mt-2 !min-h-[48px]" disabled={loading}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : "Create account"}
        </button>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account? <Link to="/login" className="tap font-bold text-brand hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
