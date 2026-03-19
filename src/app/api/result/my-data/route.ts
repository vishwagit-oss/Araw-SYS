import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const TABLES = [
  "cargo_receiving",
  "internal_discharge",
  "cash_receiving",
  "cash_discharge",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.ship.role === "admin") {
    return NextResponse.json({ error: "Use /api/result/all for admin" }, { status: 403 });
  }

  const shipId = session.ship.id;
  const result: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const r = await query(
      `SELECT * FROM ${table} WHERE ship_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [shipId]
    );
    result[table] = r.rows.map((row) => {
      const obj = { ...row };
      const created = new Date(row.created_at);
      const now = new Date();
      const days = (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
      (obj as Record<string, unknown>).can_edit = days <= 3;
      return obj;
    });
  }

  return NextResponse.json(result);
}
