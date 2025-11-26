import { useState } from "react";
import api from "../api";
import { login } from "../auth";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* Password validation */
function validatePassword(pw: string) {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
  return re.test(pw);
}

function passwordStrengthScore(pw: string) {
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

function strengthLabel(score: number) {
  switch (score) {
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Strong";
    default:
      return "Very Weak";
  }
}

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const strength = passwordStrengthScore(password);
  const strengthText = strengthLabel(strength);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!validatePassword(password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number or symbol."
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/register/", { username: username.trim(), password });

      // Attempt auto-login
      try {
        await login(username.trim(), password);
        nav("/app");
      } catch {
        nav("/login");
      }
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.username) {
        setError(Array.isArray(resp.username) ? resp.username[0] : resp.username);
      } else if (resp?.password) {
        setError(Array.isArray(resp.password) ? resp.password[0] : resp.password);
      } else if (resp?.detail) {
        setError(String(resp.detail));
      } else {
        setError("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center px-4 relative">
      <img
        src={logo}
        alt="Freelancer CRM Logo"
        className="absolute top-4 right-4 w-32 sm:w-40 md:w-48 h-auto object-contain"
      />

      <form
        onSubmit={onSubmit}
        className="bg-white/10  shadow-lg rounded-2xl p-8 w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-semibold text-white text-center">Create Account</h2>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex flex-col space-y-2 text-white">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="flex flex-col space-y-2 text-white">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Choose a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>

          {/* Password strength meter */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white">
              <span>Password strength</span>
              <span className="font-medium">{strengthText}</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 transition-all duration-300 ${
                  strength <= 1
                    ? "bg-red-500"
                    : strength === 2
                    ? "bg-yellow-400"
                    : strength === 3
                    ? "bg-amber-400"
                    : "bg-green-500"
                }`}
                style={{ width: `${(strength / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        <p className="text-sm text-center text-white">
          Already have an account?{" "}
          <Link to="/login" className="text-black hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
