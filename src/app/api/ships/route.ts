import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r = await query(
    'SELECT id, name, login_id, role FROM ships WHERE role = $1 ORDER BY name',
    ["ship"]
  );
  return NextResponse.json({ ships: r.rows });
}
