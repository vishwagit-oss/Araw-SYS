"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login_id: loginId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8 sm:py-12">
      <div className="mb-8 sm:mb-10 text-center">
        <Link href="/" className="inline-flex flex-col items-center">
          <span className="text-3xl sm:text-4xl font-bold text-sky-700">SYS OIL</span>
          <span className="text-lg font-semibold text-sky-800 uppercase tracking-wider">
            AND PETROLEUMS CORP
          </span>
        </Link>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 text-center">
          Log In
        </h1>
        <p className="text-slate-600 text-sm mb-4 text-center">
          Use your ship Login ID and password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-slate-500 text-xs mb-3 text-center bg-slate-50 p-2 rounded">
          <strong>Demo (no database):</strong> Ship: <code className="bg-white px-1">demo</code> / <code className="bg-white px-1">demo123</code> — Admin: <code className="bg-white px-1">demo_admin</code> / <code className="bg-white px-1">demo123</code>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            placeholder="Login ID"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>

      <div className="mt-auto pt-8 sm:absolute sm:bottom-8 text-center">
        <p className="text-xs sm:text-sm text-slate-500">SYS OIL AND PETROLEUMS CORP — Admin</p>
      </div>
    </div>
  );
}
