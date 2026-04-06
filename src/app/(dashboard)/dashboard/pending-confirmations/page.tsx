"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface PendingProposal {
  id: string;
  initiator_ship_id: string;
  counterpart_ship_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  initiator_name: string;
  initiator_login_id: string;
  counterpart_name: string;
  counterpart_login_id: string;
}

export default function PendingConfirmationsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/mirror-proposals/pending", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const rows = (data.proposals ?? []) as PendingProposal[];
      setProposals(
        rows.map((p) => ({
          ...p,
          payload:
            typeof p.payload === "string" ? JSON.parse(p.payload) : (p.payload as Record<string, unknown>),
        }))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setBusy(id);
    setMsg(null);
    setErr(null);
    try {
      const raw = linkId[id]?.trim();
      const res = await fetch(`/api/mirror-proposals/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw ? { existing_target_id: raw } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setMsg("Confirmed. The mirrored entry is now on your ledger.");
      await load();
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    if (!window.confirm("Reject this transfer? The initiator will be notified.")) return;
    setBusy(id);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/mirror-proposals/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      setMsg("Rejected.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  const isAdmin = user?.role === "admin";

  function payloadSummary(p: PendingProposal): string {
    const pl = p.payload;
    const parts: string[] = [];
    if (pl.date) parts.push(`Date: ${String(pl.date)}`);
    if (pl.white_mt != null || pl.yellow_mt != null) {
      parts.push(`W MT ${pl.white_mt ?? "—"} / Y MT ${pl.yellow_mt ?? "—"}`);
    }
    if (pl.amount_aed != null) parts.push(`AED ${pl.amount_aed}`);
    if (pl.to != null) parts.push(`To: ${pl.to}`);
    if (pl.from != null) parts.push(`From: ${pl.from}`);
    if (pl.to_ship != null) parts.push(`To ship: ${pl.to_ship}`);
    if (pl.from_ship != null) parts.push(`From ship: ${pl.from_ship}`);
    return parts.join(" · ") || "(see initiator record)";
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Pending confirmations</h1>
        <p className="text-slate-600 mt-1 text-sm">
          {isAdmin
            ? "Confirm or reject cross-ship cargo and cash transfers. Counterpart ships also see these."
            : "When another ship records a transfer involving your vessel, approve here to post the mirrored line on your ledger."}
        </p>
      </div>

      {msg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}
      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : proposals.length === 0 ? (
        <p className="text-slate-600 text-sm">No pending transfers.</p>
      ) : (
        <ul className="space-y-4">
          {proposals.map((p) => (
            <li
              key={p.id}
              className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-500">
                <span>
                  {p.source_type.replace(/_/g, " ")} → {p.target_type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="font-medium text-slate-900">
                From <span className="text-sky-700">{p.initiator_name}</span> ({p.initiator_login_id}) — for{" "}
                <span className="text-sky-700">{p.counterpart_name}</span>
              </p>
              <p className="text-sm text-slate-600">{payloadSummary(p)}</p>
              <p className="text-xs text-slate-400">
                Source record ID: {p.source_id}. If you already entered the same line manually, paste your row
                UUID below so we link it instead of duplicating.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <label className="flex-1 text-sm">
                  <span className="text-slate-600 block mb-1">Optional: your existing row ID (manual entry)</span>
                  <input
                    type="text"
                    value={linkId[p.id] ?? ""}
                    onChange={(e) => setLinkId((m) => ({ ...m, [p.id]: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="UUID from your ledger row"
                  />
                </label>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => approve(p.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === p.id ? "…" : "Yes, confirm"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => reject(p.id)}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        If the form said your entry matches a pending transfer, open this screen, find that proposal, paste the ID
        returned from the save response, then confirm.{" "}
        <Link href="/dashboard" className="text-sky-600 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
