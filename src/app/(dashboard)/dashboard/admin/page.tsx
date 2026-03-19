"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ActiveSession {
  id: string;
  name: string;
  login_id: string;
  logged_in_at: string;
}

interface PasswordChangeEntry {
  id: string;
  ship_name: string;
  login_id: string;
  changed_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [passwordLog, setPasswordLog] = useState<PasswordChangeEntry[]>([]);
  const [chartData, setChartData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    async function load() {
      try {
        const [sessRes, logRes] = await Promise.all([
          fetch("/api/admin/active-sessions", { credentials: "include" }),
          fetch("/api/admin/password-change-log", { credentials: "include" }),
        ]);
        if (sessRes.ok) setSessions((await sessRes.json()).sessions ?? []);
        if (logRes.ok) setPasswordLog((await logRes.json()).log ?? []);

        const dataRes = await fetch("/api/result/all?charts=1", { credentials: "include" });
        if (dataRes.ok) {
          const d = await dataRes.json();
          setChartData(d.chartData ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user?.role, router]);

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-slate-600 mt-1 text-sm">Who is logged in, password changes, and overview.</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <>
          <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Who is logged in now</h2>
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm">No active sessions.</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <span className="text-slate-500">({s.login_id})</span>
                    <span className="text-slate-400">
                      — logged in {new Date(s.logged_in_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Password change log (admin informed)</h2>
            {passwordLog.length === 0 ? (
              <p className="text-slate-500 text-sm">No password changes recorded.</p>
            ) : (
              <ul className="space-y-2">
                {passwordLog.map((e) => (
                  <li key={e.id} className="text-sm text-slate-700">
                    <span className="font-medium">{e.ship_name}</span> ({e.login_id}) changed
                    password on {new Date(e.changed_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {chartData.length > 0 && (
            <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 min-w-0">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Overview (all ships)</h2>
              <div className="h-64 sm:h-80 min-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" name="Count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">All ship data</h2>
            <p className="text-slate-600 text-sm mb-4">
              View and filter all entries per type from the Result page when logged in as admin.
            </p>
            <a
              href="/dashboard/result"
              className="text-sky-600 font-medium hover:underline"
            >
              Open Result (charts + all data) →
            </a>
          </section>
        </>
      )}
    </div>
  );
}
