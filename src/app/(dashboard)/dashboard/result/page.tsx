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

type LedgerRow = Record<string, unknown> & { id?: string };

function fmtCell(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string" && v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v))
    return v.slice(0, 10);
  return String(v);
}

function adminEditHref(tableKey: string, id: string): string {
  switch (tableKey) {
    case "cargo_receiving":
      return `/dashboard/cargo-receiving?mode=receiving&edit=${id}`;
    case "internal_discharge":
      return `/dashboard/internal-discharge?edit=${id}`;
    case "cash_receiving":
      return `/dashboard/cash-receiving?mode=receiving&edit=${id}`;
    case "cash_discharge":
      return `/dashboard/cash-receiving?mode=discharge&edit=${id}`;
    default:
      return "/dashboard/result";
  }
}

export default function ResultPage() {
  const { user } = useAuth();
  const [myData, setMyData] = useState<Record<string, { can_edit?: boolean; id: string; created_at: string; [k: string]: unknown }[]>>({});
  const [chartData, setChartData] = useState<{ name: string; count: number }[]>([]);
  const [adminLedgers, setAdminLedgers] = useState<{
    cargo_receiving: LedgerRow[];
    internal_discharge: LedgerRow[];
    cash_receiving: LedgerRow[];
    cash_discharge: LedgerRow[];
  } | null>(null);
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
            setAdminLedgers({
              cargo_receiving: Array.isArray(d.cargo_receiving) ? d.cargo_receiving : [],
              internal_discharge: Array.isArray(d.internal_discharge) ? d.internal_discharge : [],
              cash_receiving: Array.isArray(d.cash_receiving) ? d.cash_receiving : [],
              cash_discharge: Array.isArray(d.cash_discharge) ? d.cash_discharge : [],
            });
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
            ? "Charts, per-ship cash counterparty (FROM / TO), and cargo lines for all ships. Open Admin for sessions and password log."
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

          {adminLedgers && (
            <div className="space-y-8">
              <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                  Cash receiving (all ships)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Each row: the ship whose books this is on, and <strong>FROM</strong> (who paid them —
                  other ship name, Office, or free text).
                </p>
                <div className="overflow-x-auto -mx-1">
                  {adminLedgers.cash_receiving.length === 0 ? (
                    <p className="text-slate-500 text-sm">No cash receiving rows.</p>
                  ) : (
                    <table className="w-full text-xs sm:text-sm min-w-[720px]">
                      <thead className="text-left text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Book (ship)</th>
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">FROM (counterparty)</th>
                          <th className="py-2 pr-2 font-medium">Amount AED</th>
                          <th className="py-2 pr-2 font-medium">Location</th>
                          <th className="py-2 pr-2 font-medium">Remark</th>
                          <th className="py-2 pr-2 font-medium">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {adminLedgers.cash_receiving.map((row) => (
                          <tr key={String(row.id)} className="border-b border-slate-50 align-top">
                            <td className="py-2 pr-2 font-medium">{fmtCell(row.ship_name)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.date)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.from_ship)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.amount_aed)}</td>
                            <td className="py-2 pr-2 max-w-[140px] truncate" title={String(row.location ?? "")}>
                              {fmtCell(row.location)}
                            </td>
                            <td className="py-2 pr-2 max-w-[180px] truncate" title={String(row.remark ?? "")}>
                              {fmtCell(row.remark)}
                            </td>
                            <td className="py-2 pr-2 whitespace-nowrap">
                              {row.id ? (
                                <Link
                                  href={adminEditHref("cash_receiving", String(row.id))}
                                  className="text-sky-600 font-medium hover:underline"
                                >
                                  Edit
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                  Cash discharge (all ships)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Each row: the ship who paid out, and <strong>TO</strong> (who received it).
                </p>
                <div className="overflow-x-auto -mx-1">
                  {adminLedgers.cash_discharge.length === 0 ? (
                    <p className="text-slate-500 text-sm">No cash discharge rows.</p>
                  ) : (
                    <table className="w-full text-xs sm:text-sm min-w-[720px]">
                      <thead className="text-left text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Book (ship)</th>
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">TO (counterparty)</th>
                          <th className="py-2 pr-2 font-medium">Amount AED</th>
                          <th className="py-2 pr-2 font-medium">Location</th>
                          <th className="py-2 pr-2 font-medium">Remark</th>
                          <th className="py-2 pr-2 font-medium">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {adminLedgers.cash_discharge.map((row) => (
                          <tr key={String(row.id)} className="border-b border-slate-50 align-top">
                            <td className="py-2 pr-2 font-medium">{fmtCell(row.ship_name)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.date)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.to_ship)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.amount_aed)}</td>
                            <td className="py-2 pr-2 max-w-[140px] truncate" title={String(row.location ?? "")}>
                              {fmtCell(row.location)}
                            </td>
                            <td className="py-2 pr-2 max-w-[180px] truncate" title={String(row.remark ?? "")}>
                              {fmtCell(row.remark)}
                            </td>
                            <td className="py-2 pr-2 whitespace-nowrap">
                              {row.id ? (
                                <Link
                                  href={adminEditHref("cash_discharge", String(row.id))}
                                  className="text-sky-600 font-medium hover:underline"
                                >
                                  Edit
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                  Cargo receiving (all ships)
                </h3>
                <div className="overflow-x-auto -mx-1">
                  {adminLedgers.cargo_receiving.length === 0 ? (
                    <p className="text-slate-500 text-sm">No cargo receiving rows.</p>
                  ) : (
                    <table className="w-full text-xs sm:text-sm min-w-[800px]">
                      <thead className="text-left text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Ship</th>
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">From</th>
                          <th className="py-2 pr-2 font-medium">W MT</th>
                          <th className="py-2 pr-2 font-medium">Y MT</th>
                          <th className="py-2 pr-2 font-medium">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {adminLedgers.cargo_receiving.map((row) => (
                          <tr key={String(row.id)} className="border-b border-slate-50 align-top">
                            <td className="py-2 pr-2 font-medium">{fmtCell(row.ship_name)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.date)}</td>
                            <td className="py-2 pr-2">{fmtCell((row as LedgerRow & { from?: string }).from)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.white_mt)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.yellow_mt)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">
                              {row.id ? (
                                <Link
                                  href={adminEditHref("cargo_receiving", String(row.id))}
                                  className="text-sky-600 font-medium hover:underline"
                                >
                                  Edit
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                  Internal discharge (all ships)
                </h3>
                <div className="overflow-x-auto -mx-1">
                  {adminLedgers.internal_discharge.length === 0 ? (
                    <p className="text-slate-500 text-sm">No internal discharge rows.</p>
                  ) : (
                    <table className="w-full text-xs sm:text-sm min-w-[800px]">
                      <thead className="text-left text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Ship</th>
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">To</th>
                          <th className="py-2 pr-2 font-medium">W MT</th>
                          <th className="py-2 pr-2 font-medium">Y MT</th>
                          <th className="py-2 pr-2 font-medium">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {adminLedgers.internal_discharge.map((row) => (
                          <tr key={String(row.id)} className="border-b border-slate-50 align-top">
                            <td className="py-2 pr-2 font-medium">{fmtCell(row.ship_name)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtCell(row.date)}</td>
                            <td className="py-2 pr-2">{fmtCell((row as LedgerRow & { to?: string }).to)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.white_mt)}</td>
                            <td className="py-2 pr-2">{fmtCell(row.yellow_mt)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">
                              {row.id ? (
                                <Link
                                  href={adminEditHref("internal_discharge", String(row.id))}
                                  className="text-sky-600 font-medium hover:underline"
                                >
                                  Edit
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>
          )}

          <p className="text-sm text-slate-600">
            <Link href="/dashboard/admin" className="text-sky-600 font-medium hover:underline">
              Open Admin
            </Link>{" "}
            for who is logged in and the password change log. Per-ship <strong>totals</strong> (white/yellow,
            cash) are on the{" "}
            <Link href="/dashboard" className="text-sky-600 font-medium hover:underline">
              Home
            </Link>{" "}
            dashboard.
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
