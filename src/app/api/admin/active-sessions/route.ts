import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.ship.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const r = await query(
    `SELECT s.id, s.name, s.login_id, ss.created_at as logged_in_at
     FROM sessions ss
     JOIN ships s ON s.id = ss.ship_id
     WHERE ss.expires_at > now()
     ORDER BY ss.created_at DESC`
  );
  return NextResponse.json({ sessions: r.rows });
}
