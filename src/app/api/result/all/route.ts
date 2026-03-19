import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const TABLES = [
  "cargo_receiving",
  "internal_discharge",
  "cash_receiving",
  "cash_discharge",
] as const;

const LABEL_OVERRIDES: Record<(typeof TABLES)[number], string> = {
  cargo_receiving: "Cargo Receiving",
  internal_discharge: "Cargo Discharge",
  cash_receiving: "Cash Receiving",
  cash_discharge: "Cash Discharge",
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.ship.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const charts = searchParams.get("charts") === "1";

  const result: Record<string, unknown[]> = {};
  const chartData: { name: string; count: number }[] = [];

  for (const table of TABLES) {
    const r = await query(
      `SELECT r.*, s.name as ship_name FROM ${table} r JOIN ships s ON s.id = r.ship_id ORDER BY r.created_at DESC LIMIT 500`
    );
    result[table] = r.rows;
    if (charts) {
      const label = LABEL_OVERRIDES[table] ?? table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      chartData.push({ name: label, count: r.rows.length });
    }
  }

  if (charts) {
    return NextResponse.json({ ...result, chartData });
  }
  return NextResponse.json(result);
}
