"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SHIP_NAMES } from "@/types";

type Mode = "receiving" | "discharge";

interface ShipOption {
  id: string;
  name: string;
  login_id: string;
}

export default function CashReceivingPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const modeParam = searchParams.get("mode");

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [mode, setMode] = useState<Mode>(modeParam === "discharge" ? "discharge" : "receiving");
  const [ships, setShips] = useState<ShipOption[]>([]);

  // CASH ship (the user who is recording the cash entry).
  const [cashShipId, setCashShipId] = useState("");

  // Counterparty selector (FROM/TO) as: ship names + Office + Other (free text only for Other).
  const [fromParty, setFromParty] = useState<string>("");
  const [fromOtherText, setFromOtherText] = useState<string>("");
  const [toParty, setToParty] = useState<string>("");
  const [toOtherText, setToOtherText] = useState<string>("");

  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [amountAed, setAmountAed] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    setMode(modeParam === "discharge" ? "discharge" : "receiving");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam]);

  useEffect(() => {
    if (editId) return;
    setFromParty("");
    setFromOtherText("");
    setToParty("");
    setToOtherText("");
  }, [mode, editId]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/ships", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setShips(d.ships ?? []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }

    const endpoint = mode === "receiving" ? "/api/data/cash-receiving" : "/api/data/cash-discharge";
    setLoading(true);

    fetch(`${endpoint}?id=${editId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Load failed");
        return r.json();
      })
      .then((row) => {
        setDate(row.date ? row.date.slice(0, 10) : "");
        setLocation(row.location ?? "");
        setRemark(row.remark ?? "");
        setAmountAed(row.amount_aed != null ? String(row.amount_aed) : "");
        setCashShipId(row.ship_id ?? "");

        const classifyParty = (value: string) => {
          const v = String(value ?? "").trim();
          if (!v) return { party: "", otherText: "" };
          if (v.toLowerCase() === "office") return { party: "Office", otherText: "" };
          const match = SHIP_NAMES.find((n) => n.toLowerCase() === v.toLowerCase());
          if (match) return { party: match, otherText: "" };
          return { party: "Other", otherText: v };
        };

        if (mode === "receiving") {
          const classified = classifyParty(row.from_ship ?? "");
          setFromParty(classified.party);
          setFromOtherText(classified.otherText);
          setToParty("");
          setToOtherText("");
        } else {
          const classified = classifyParty(row.to_ship ?? "");
          setToParty(classified.party);
          setToOtherText(classified.otherText);
          setFromParty("");
          setFromOtherText("");
        }
      })
      .catch(() => setSubmitResult("Failed to load record for editing."))
      .finally(() => setLoading(false));
  }, [editId, mode]);

  const endpoint = mode === "receiving" ? "/api/data/cash-receiving" : "/api/data/cash-discharge";
  const method = editId ? "PUT" : "POST";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitResult("");

    if (isAdmin && !cashShipId) {
      setSubmitResult("Please select ship (for whom).");
      return;
    }

    const computedFrom =
      fromParty === "Other" ? fromOtherText.trim() : fromParty.trim();
    const computedTo = toParty === "Other" ? toOtherText.trim() : toParty.trim();

    if (mode === "receiving" && !computedFrom) {
      setSubmitResult("Please select FROM (ship/office/other).");
      return;
    }

    if (mode === "discharge" && !computedTo) {
      setSubmitResult("Please select TO (ship/office/other).");
      return;
    }

    if (!amountAed || Number.isNaN(Number(amountAed))) {
      setSubmitResult("Please enter AMOUNT (AED).");
      return;
    }

    const payload: Record<string, unknown> = {
      date: date || null,
      location: location || null,
      remark: remark || null,
      amount_aed: Number(amountAed),
      attachment_url: null,
    };

    if (mode === "receiving") {
      payload.from_ship = computedFrom;
    } else {
      payload.to_ship = computedTo;
    }

    if (isAdmin && cashShipId) payload.ship_id = cashShipId;
    if (editId) payload.id = editId;

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setSubmitResult(editId ? "Updated successfully." : "Saved successfully.");
      if (editId) handleCancel();
    } else {
      setSubmitResult(data.error ?? "Failed to save.");
    }
  };

  const handleCancel = () => {
    setDate("");
    setFromParty("");
    setFromOtherText("");
    setToParty("");
    setToOtherText("");
    setLocation("");
    setRemark("");
    setAmountAed("");
    setAttachment(null);
    setSubmitResult(null);
    if (editId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      url.searchParams.set("mode", mode);
      window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SYS OIL AND PETROLEUMS CORP</h1>
          <h2 className="text-base sm:text-lg font-semibold text-slate-700 mt-1">CASH RECEIVING / DISCHARGE</h2>
        </div>

        {submitResult && (
          <div className="px-3 py-2 bg-sky-100 text-sky-800 rounded-lg text-xs sm:text-sm font-medium max-w-full">
            RESULT: {submitResult}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const next: Mode = "receiving";
            setMode(next);
            const url = new URL(window.location.href);
            url.searchParams.set("mode", next);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname + `?${url.searchParams.toString()}`);
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
            mode === "receiving"
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          RECEIVING
        </button>
        <button
          type="button"
          onClick={() => {
            const next: Mode = "discharge";
            setMode(next);
            const url = new URL(window.location.href);
            url.searchParams.set("mode", next);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname + `?${url.searchParams.toString()}`);
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
            mode === "discharge"
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          DISCHARGE
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full max-w-2xl">
          <div>
            {isAdmin ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SHIP (for whom)</label>
                <select
                  value={cashShipId}
                  onChange={(e) => setCashShipId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select ship</option>
                  {ships.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-700">
                Logged in as: <span className="font-semibold text-slate-900">{user?.name}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DATE</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {mode === "receiving" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">FROM</label>
                <select
                  value={fromParty}
                  onChange={(e) => setFromParty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select</option>
                  {SHIP_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
                {fromParty === "Other" && (
                  <input
                    type="text"
                    value={fromOtherText}
                    onChange={(e) => setFromOtherText(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Type client name"
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TO</label>
                <select
                  value={toParty}
                  onChange={(e) => setToParty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select</option>
                  {SHIP_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
                {toParty === "Other" && (
                  <input
                    type="text"
                    value={toOtherText}
                    onChange={(e) => setToOtherText(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Type client name"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LOCATION</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">REMARK</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Remarks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">AMOUNT (AED)</label>
            <input
              type="number"
              step="any"
              value={amountAed}
              onChange={(e) => setAmountAed(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attachment</label>
            <label className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 text-sm font-medium">
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </label>
            {attachment && <span className="ml-2 text-sm text-slate-600">{attachment.name}</span>}
            <p className="text-xs text-slate-500 mt-1">Stored as attachment_url for now (upload not implemented).</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

