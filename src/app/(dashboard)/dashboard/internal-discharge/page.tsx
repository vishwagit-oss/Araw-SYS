"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SHIP_NAMES, IG_TO_MT_RATE, MT_TO_IG_RATE } from "@/types";

type ActiveColor = "white" | "yellow" | null;

function useIgMtConversion() {
  const [ig, setIg] = useState<string>("");
  const [mt, setMt] = useState<string>("");

  const updateFromIg = useCallback((value: string) => {
    setIg(value);
    if (value === "") {
      setMt("");
      return;
    }
    const n = parseFloat(value);
    if (!Number.isNaN(n)) setMt((n * IG_TO_MT_RATE).toFixed(4));
    else setMt("");
  }, []);

  const updateFromMt = useCallback((value: string) => {
    setMt(value);
    if (value === "") {
      setIg("");
      return;
    }
    const n = parseFloat(value);
    if (!Number.isNaN(n)) setIg((n * MT_TO_IG_RATE).toFixed(2));
    else setIg("");
  }, []);

  return { ig, mt, setIg, setMt, updateFromIg, updateFromMt };
}

interface ShipOption {
  id: string;
  name: string;
}

export default function InternalDischargePage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [ships, setShips] = useState<ShipOption[]>([]);

  const [fromShipId, setFromShipId] = useState<string>("");
  const [toShipName, setToShipName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  const white = useIgMtConversion();
  const yellow = useIgMtConversion();
  const [activeColor, setActiveColor] = useState<ActiveColor>(null);

  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!editId);

  const activateWhite = () => {
    setActiveColor("white");
    yellow.setIg("");
    yellow.setMt("");
  };

  const activateYellow = () => {
    setActiveColor("yellow");
    white.setIg("");
    white.setMt("");
  };

  const whiteDisabled = activeColor === "yellow";
  const yellowDisabled = activeColor === "white";

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setFromShipId(user.id);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/ships", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setShips((d.ships ?? []).map((s: any) => ({ id: s.id, name: s.name })))
      )
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      setSubmitResult(null);
      return;
    }

    setLoading(true);
    fetch(`/api/data/internal-discharge?id=${editId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Load failed");
        return r.json();
      })
      .then((row) => {
        setDate(row.date ? row.date.slice(0, 10) : "");
        setToShipName(row.to ?? "");
        setLocation(row.location ?? "");
        setRemark(row.remark ?? "");

        // Load stock values.
        white.setIg(row.white_ig != null ? String(row.white_ig) : "");
        white.setMt(row.white_mt != null ? String(row.white_mt) : "");
        yellow.setIg(row.yellow_ig != null ? String(row.yellow_ig) : "");
        yellow.setMt(row.yellow_mt != null ? String(row.yellow_mt) : "");

        const hasWhite = row.white_ig != null || row.white_mt != null;
        const hasYellow = row.yellow_ig != null || row.yellow_mt != null;

        if (hasYellow && !hasWhite) activateYellow();
        else if (hasWhite && !hasYellow) activateWhite();
        else if (hasWhite && hasYellow) activateWhite();
        else setActiveColor(null);

        if (row.ship_id) {
          setFromShipId(row.ship_id);
        }
      })
      .catch(() => setSubmitResult("Failed to load record for editing."))
      .finally(() => setLoading(false));
  }, [editId]);

  useEffect(() => {
    if (!isAdmin) return;
    // Ensure fromShipId is always something valid for admin.
    if (!fromShipId && ships.length > 0) setFromShipId(ships[0].id);
  }, [isAdmin, ships, fromShipId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult("");

    if (isAdmin && !fromShipId) {
      setSubmitResult("Please select FROM ship.");
      return;
    }
    if (!toShipName) {
      setSubmitResult("Please select TO ship.");
      return;
    }

    if (activeColor === null) {
      setSubmitResult("Please enter either WHITE or YELLOW IG/MT values.");
      return;
    }

    const payload: Record<string, unknown> = {
      date: date || null,
      to: toShipName || null,
      location: location || null,
      remark: remark || null,
      ship_name_other: null,
      attachment_url: null,
      white_ig: white.ig ? Number(white.ig) : null,
      white_mt: white.mt ? Number(white.mt) : null,
      yellow_ig: yellow.ig ? Number(yellow.ig) : null,
      yellow_mt: yellow.mt ? Number(yellow.mt) : null,
    };

    if (isAdmin) payload.ship_id = fromShipId;

    // Store FROM as ship_name_other for visibility.
    if (fromShipId) {
      const fromShip = ships.find((s) => s.id === fromShipId);
      payload.ship_name_other = fromShip?.name ?? user?.name ?? null;
    } else {
      payload.ship_name_other = user?.name ?? null;
    }

    if (editId) payload.id = editId;

    const endpoint = "/api/data/internal-discharge";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSubmitResult(editId ? "Updated successfully." : "Saved successfully.");
      if (editId) {
        const url = new URL(window.location.href);
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
      }
    } else {
      setSubmitResult(data.error ?? "Failed to save.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SYS OIL AND PETROLEUMS CORP</h1>
          <h2 className="text-base sm:text-lg font-semibold text-slate-700 mt-1">INTERNAL DISCHARGE</h2>
        </div>
        {submitResult && (
          <div className="px-3 py-2 bg-sky-100 text-sky-800 rounded-lg text-xs sm:text-sm font-medium max-w-full">
            RESULT: {submitResult}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">FROM</label>
            <select
              value={fromShipId}
              onChange={(e) => setFromShipId(e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-70"
            >
              {ships.length > 0 ? (
                ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              ) : (
                <option value={user?.id ?? ""}>{user?.name ?? "Ship"}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TO</label>
            <select
              value={toShipName}
              onChange={(e) => setToShipName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">Select</option>
              {SHIP_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">DATE</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
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

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-800 mb-3">WHITE</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">I.G.</label>
                  <input
                    type="number"
                    step="any"
                    value={white.ig}
                    onChange={(e) => {
                      activateWhite();
                      white.updateFromIg(e.target.value);
                    }}
                    disabled={whiteDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${whiteDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">M.T.</label>
                  <input
                    type="number"
                    step="any"
                    value={white.mt}
                    onChange={(e) => {
                      activateWhite();
                      white.updateFromMt(e.target.value);
                    }}
                    disabled={whiteDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${whiteDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-800 mb-3">YELLOW</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">I.G.</label>
                  <input
                    type="number"
                    step="any"
                    value={yellow.ig}
                    onChange={(e) => {
                      activateYellow();
                      yellow.updateFromIg(e.target.value);
                    }}
                    disabled={yellowDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${yellowDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">M.T.</label>
                  <input
                    type="number"
                    step="any"
                    value={yellow.mt}
                    onChange={(e) => {
                      activateYellow();
                      yellow.updateFromMt(e.target.value);
                    }}
                    disabled={yellowDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${yellowDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>
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
            <p className="text-xs text-slate-500 mt-1">Saved as attachment_url = null for now.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition">
              Submit
            </button>
            <button
              type="button"
              onClick={() => {
                setDate("");
                setToShipName("");
                setLocation("");
                setRemark("");
                setAttachment(null);
                setSubmitResult(null);
                white.setIg("");
                white.setMt("");
                yellow.setIg("");
                yellow.setMt("");
                setActiveColor(null);
              }}
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
