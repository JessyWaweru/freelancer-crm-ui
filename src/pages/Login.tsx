import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../auth";
import AuthShell from "@/components/AuthShell";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      nav("/app");
    } catch {
      setErr("That username and password don't match.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see what needs invoicing today.">
      <form onSubmit={onSubmit} className="grid gap-4">
        {err && (
          <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} className="text-sm text-destructive bg-[#fdecea] rounded-xl p-3">
            {err}
          </motion.p>
        )}
        <label className="field">
          <span className="field-label">Username</span>
          <input className="input" autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} disabled={loading} required autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <div className="relative">
            <input className="input !pr-11" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} disabled={loading} required />
            <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn !h-9 !w-9" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        <button type="submit" className="btn btn-primary w-full mt-2 !min-h-[48px]" disabled={loading}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Logging in…</> : "Log in"}
        </button>
        <p className="text-sm text-center text-muted-foreground">
          New here? <Link to="/signup" className="font-bold text-brand hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
