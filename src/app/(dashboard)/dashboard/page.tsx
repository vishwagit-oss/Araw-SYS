"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const options = [
  { href: "/dashboard/cargo-receiving", label: "Cargo Receiving / Discharge", icon: Truck },
  { href: "/dashboard/internal-discharge", label: "Internal Discharge", icon: Truck },
  { href: "/dashboard/cash-receiving", label: "Cash Receiving / Discharge", icon: Truck },
  { href: "/dashboard/result", label: "Result", icon: BarChart3 },
];

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<
    | null
    | Array<{
        ship_id: string;
        ship_name: string;
        white_ig_remaining: string | number;
        white_mt_remaining: string | number;
        yellow_ig_remaining: string | number;
        yellow_mt_remaining: string | number;
        cash_amount_remaining: string | number;
      }>
  >(null);

  useEffect(() => {
    async function load() {
      if (!user || user.role !== "admin") return;
      try {
        const res = await fetch("/api/admin/summary", { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          setSummary(d.summary ?? []);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [user]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SYS OIL AND PETROLEUMS CORP</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Home — Select an option to open that page</p>
      </div>

      {user?.role === "admin" && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">
            Cargo + Cash Remaining (all ships)
          </h2>
          {summary === null ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : summary.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-3">Ship</th>
                    <th className="py-2 pr-3">White IG</th>
                    <th className="py-2 pr-3">White MT</th>
                    <th className="py-2 pr-3">Yellow IG</th>
                    <th className="py-2 pr-3">Yellow MT</th>
                    <th className="py-2 pr-3">Cash (AED)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {summary.map((s) => (
                    <tr key={s.ship_id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium">{s.ship_name}</td>
                      <td className="py-2 pr-3">{s.white_ig_remaining}</td>
                      <td className="py-2 pr-3">{s.white_mt_remaining}</td>
                      <td className="py-2 pr-3">{s.yellow_ig_remaining}</td>
                      <td className="py-2 pr-3">{s.yellow_mt_remaining}</td>
                      <td className="py-2 pr-3">{s.cash_amount_remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {options.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 hover:bg-sky-50/50 transition"
            >
              <div className="p-3 bg-sky-100 rounded-lg">
                <Icon className="w-6 h-6 text-sky-600" />
              </div>
              <span className="font-semibold text-slate-900">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-slate-500">
        The options are click options. Whatever page option you select, that page will open.
      </p>
    </div>
  );
}
