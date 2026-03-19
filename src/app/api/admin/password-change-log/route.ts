import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.ship.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const r = await query(
    `SELECT pcl.id, pcl.changed_at, s.name as ship_name, s.login_id
     FROM password_change_log pcl
     JOIN ships s ON s.id = pcl.ship_id
     ORDER BY pcl.changed_at DESC
     LIMIT 100`
  );
  return NextResponse.json({ log: r.rows });
}
