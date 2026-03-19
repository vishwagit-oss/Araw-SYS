"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { IG_TO_MT_RATE, MT_TO_IG_RATE } from "@/types";

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
    if (!Number.isNaN(n)) {
      setMt((n * IG_TO_MT_RATE).toFixed(4));
    } else {
      setMt("");
    }
  }, []);

  const updateFromMt = useCallback((value: string) => {
    setMt(value);
    if (value === "") {
      setIg("");
      return;
    }
    const n = parseFloat(value);
    if (!Number.isNaN(n)) {
      setIg((n * MT_TO_IG_RATE).toFixed(2));
    } else {
      setIg("");
    }
  }, []);

  return { ig, mt, setIg, setMt, updateFromIg, updateFromMt };
}

interface ShipOption {
  id: string;
  name: string;
  login_id: string;
}

export default function CargoReceivingPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const modeParam = searchParams.get("mode");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [mode, setMode] = useState<"receiving" | "discharge">(
    modeParam === "discharge" ? "discharge" : "receiving"
  );

  useEffect(() => {
    setMode(modeParam === "discharge" ? "discharge" : "receiving");
    // If we are switching modes while editing, clear the edit state in the URL
    // (receiving/discharge rows are stored in different tables).
    if (editId) {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", modeParam === "discharge" ? "discharge" : "receiving");
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam]);

  useEffect(() => {
    if (!editId) setActiveColor(null);
  }, [mode, editId]);

  useEffect(() => {
    if (editId) return;
    setFrom("");
    setTo("");
    setWhitePriceAed("");
    setYellowPriceAed("");
    white.setIg("");
    white.setMt("");
    yellow.setIg("");
    yellow.setMt("");
  }, [mode, editId]);

  const [ships, setShips] = useState<ShipOption[]>([]);
  const [shipId, setShipId] = useState("");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!editId);

  const white = useIgMtConversion();
  const yellow = useIgMtConversion();
  const [whitePriceAed, setWhitePriceAed] = useState("");
  const [yellowPriceAed, setYellowPriceAed] = useState("");
  const [activeColor, setActiveColor] = useState<"white" | "yellow" | null>(null);

  const activateWhite = () => {
    setActiveColor("white");
    yellow.setIg("");
    yellow.setMt("");
    setYellowPriceAed("");
  };

  const activateYellow = () => {
    setActiveColor("yellow");
    white.setIg("");
    white.setMt("");
    setWhitePriceAed("");
  };

  const whiteDisabled = activeColor === "yellow";
  const yellowDisabled = activeColor === "white";

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

    const endpoint =
      mode === "receiving" ? "/api/data/cargo-receiving" : "/api/data/internal-discharge";

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

        white.setIg(row.white_ig != null ? String(row.white_ig) : "");
        white.setMt(row.white_mt != null ? String(row.white_mt) : "");
        yellow.setIg(row.yellow_ig != null ? String(row.yellow_ig) : "");
        yellow.setMt(row.yellow_mt != null ? String(row.yellow_mt) : "");

        const hasWhite = row.white_ig != null || row.white_mt != null;
        const hasYellow = row.yellow_ig != null || row.yellow_mt != null;

        if (mode === "receiving") {
          setFrom(row.from ?? "");
          setTo("");
          setWhitePriceAed(
            row.white_price_aed != null ? String(row.white_price_aed) : ""
          );
          setYellowPriceAed(
            row.yellow_price_aed != null ? String(row.yellow_price_aed) : ""
          );
        } else {
          setTo(row.to ?? "");
          setFrom("");
          setWhitePriceAed("");
          setYellowPriceAed("");
        }

        // Enforce "one side at a time" (fade/disable other panel).
        // If both exist (old data), we keep WHITE by default.
        if (hasWhite && !hasYellow) activateWhite();
        else if (!hasWhite && hasYellow) activateYellow();
        else if (hasWhite && hasYellow) activateWhite();
        else setActiveColor(null);
      })
      .catch(() => setSubmitResult("Failed to load record for editing."))
      .finally(() => setLoading(false));
  }, [editId, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !shipId) {
      setSubmitResult("Please select a ship.");
      return;
    }
    setSubmitResult("");
    const endpoint =
      mode === "receiving" ? "/api/data/cargo-receiving" : "/api/data/internal-discharge";

    const payload: Record<string, unknown> = {
      date: date || null,
      location: location || null,
      remark: remark || null,
      white_ig: white.ig ? Number(white.ig) : null,
      white_mt: white.mt ? Number(white.mt) : null,
      yellow_ig: yellow.ig ? Number(yellow.ig) : null,
      yellow_mt: yellow.mt ? Number(yellow.mt) : null,
      attachment_url: null,
    };

    if (mode === "receiving") {
      payload.from = from || null;
      payload.white_price_aed = whitePriceAed ? Number(whitePriceAed) : null;
      payload.yellow_price_aed = yellowPriceAed ? Number(yellowPriceAed) : null;
    } else {
      payload.to = to || null;
    }

    if (isAdmin && shipId) payload.ship_id = shipId;
    if (editId) payload.id = editId;

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
      if (editId) handleCancel();
    } else {
      setSubmitResult(data.error ?? "Failed to save.");
    }
  };

  const handleCancel = () => {
    setDate("");
    setFrom("");
    setTo("");
    setLocation("");
    setRemark("");
    setAttachment(null);
    setSubmitResult(null);
    setWhitePriceAed("");
    setYellowPriceAed("");
    white.setIg("");
    white.setMt("");
    yellow.setIg("");
    yellow.setMt("");
    if (editId) {
      window.history.replaceState(
        {},
        "",
        `/dashboard/cargo-receiving?mode=${mode}`
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SYS OIL AND PETROLEUMS CORP</h1>
          <h2 className="text-base sm:text-lg font-semibold text-slate-700 mt-1">CARGO RECEIVING / DISCHARGE</h2>
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
            const next = "receiving" as const;
            setMode(next);
            const url = new URL(window.location.href);
            url.searchParams.set("mode", next);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
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
            const next = "discharge" as const;
            setMode(next);
            const url = new URL(window.location.href);
            url.searchParams.set("mode", next);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
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
                value={shipId}
                onChange={(e) => setShipId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select ship</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                list="cargo-from-ships"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Type client/ship name"
              />
              <datalist id="cargo-from-ships">
                {ships.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TO</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                list="cargo-to-ships"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Type client/ship name"
              />
              <datalist id="cargo-to-ships">
                {ships.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
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
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Remarks"
          />
        </div>

        <p className="text-xs text-slate-500">Conversion: 1000 I.G. = 3.787 M.T. (auto-calculated)</p>

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
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                    whiteDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                    whiteDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
              {mode === "receiving" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Price (AED)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={whitePriceAed}
                    onChange={(e) => {
                      activateWhite();
                      setWhitePriceAed(e.target.value);
                    }}
                    disabled={whiteDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                      whiteDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    placeholder="AED"
                  />
                </div>
              )}
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
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                    yellowDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                    yellowDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
              {mode === "receiving" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Price (AED)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={yellowPriceAed}
                    onChange={(e) => {
                      activateYellow();
                      setYellowPriceAed(e.target.value);
                    }}
                    disabled={yellowDisabled}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg ${
                      yellowDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    placeholder="AED"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Attachment</label>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 text-sm font-medium">
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </label>
            {attachment && (
              <span className="text-sm text-slate-600">{attachment.name}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Upload or click to add photo</p>
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
