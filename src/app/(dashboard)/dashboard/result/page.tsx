"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DATA_LABELS: Record<string, string> = {
  cargo_receiving: "Cargo Receiving",
  internal_discharge: "Internal Discharge",
  cash_receiving: "Cash Receiving",
  cash_discharge: "Cash Discharge",
};

export default function ResultPage() {
  const { user } = useAuth();
  const [myData, setMyData] = useState<Record<string, { can_edit?: boolean; id: string; created_at: string; [k: string]: unknown }[]>>({});
  const [chartData, setChartData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    async function load() {
      try {
        if (isAdmin) {
          const res = await fetch("/api/result/all?charts=1", { credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            setChartData(d.chartData ?? []);
          }
        } else {
          const res = await fetch("/api/result/my-data", { credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            setMyData(d);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Result</h1>
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SYS OIL AND PETROLEUMS CORP</h1>
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 mt-1">RESULT</h2>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">
          {isAdmin
            ? "Charts and all ship data. Use Admin page to see who is online and password changes."
            : "Your entered data. You can edit entries within 3 days of creation."}
        </p>
      </div>

      {isAdmin ? (
        <>
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
              Overview (all ships)
            </h3>
            {chartData.length > 0 ? (
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
            ) : (
              <p className="text-slate-500">No data yet.</p>
            )}
          </div>
          <p className="text-sm text-slate-600">
            <Link href="/dashboard/admin" className="text-sky-600 font-medium hover:underline">
              Open Admin
            </Link>{" "}
            to see who is logged in, password change log, and all ship data.
          </p>
        </>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            You can edit your entries within <strong>3 days</strong> of creation. After that, data is locked.
          </p>
          {Object.entries(myData).map(([key, rows]) => {
            const list = Array.isArray(rows) ? rows : [];
            if (list.length === 0) return null;
            return (
              <div
                key={key}
                className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-800 mb-3">
                  {DATA_LABELS[key] ?? key}
                </h3>
                <ul className="space-y-2 divide-y divide-slate-100">
                  {list.map((row: { id: string; created_at: string; can_edit?: boolean }) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 pt-2 first:pt-0">
                      <span className="text-sm text-slate-600">
                        Entry — {new Date(row.created_at).toLocaleString()}
                      </span>
                      {row.can_edit && (
                        <Link
                          href={
                            key === "cargo_receiving"
                              ? `/dashboard/cargo-receiving?mode=receiving&edit=${row.id}`
                              : key === "internal_discharge"
                                ? `/dashboard/internal-discharge?edit=${row.id}`
                                : key === "cash_receiving"
                                  ? `/dashboard/cash-receiving?mode=receiving&edit=${row.id}`
                                  : key === "cash_discharge"
                                    ? `/dashboard/cash-receiving?mode=discharge&edit=${row.id}`
                                    : `/dashboard/result`
                          }
                          className="text-sm text-sky-600 font-medium hover:underline"
                        >
                          Edit
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {Object.keys(myData).every((k) => (myData[k] as unknown[]).length === 0) && (
            <p className="text-slate-500">You have not entered any data yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
