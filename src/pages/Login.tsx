import { useState } from "react";
import { login } from "../auth";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(username, password);
      nav("/app");
    } catch (e) {
      setErr("Invalid credentials");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 px-4 text-white">
      
      {/* ✅ Logo */}
      <img
        src={logo}
        alt="Freelancer CRM Logo"
        className="absolute top-4 right-4 w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 object-contain drop-shadow-lg"
      />

      {/* ✅ Login Card */}
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl rounded-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Login to Freelancer CRM
          </CardTitle>
          <Separator className="bg-white/30 w-1/2 mx-auto" />
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col space-y-4">
            {err && (
              <p className="text-sm text-red-500 bg-red-50/80 border border-red-200 p-2 rounded text-center">
                {err}
              </p>
            )}

            <div className="flex flex-col space-y-2">
              <Label htmlFor="username" className="text-white/90">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setU(e.target.value)}
                className="bg-white text-gray-900 border-gray-300 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="password" className="text-white/90">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setP(e.target.value)}
                className="bg-white text-gray-900 border-gray-300 focus-visible:ring-indigo-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Login
            </Button>

            <p className="text-sm text-gray-200 text-center">
              New user?{" "}
              <Link to="/signup" className="text-white font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
