import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.ship.role === "admin";
  const shipId = session.ship.id;

  try {
    const r = await query(
      `SELECT mp.*,
              si.name AS initiator_name,
              si.login_id AS initiator_login_id,
              sc.name AS counterpart_name,
              sc.login_id AS counterpart_login_id
         FROM mirror_proposals mp
         JOIN ships si ON si.id = mp.initiator_ship_id
         JOIN ships sc ON sc.id = mp.counterpart_ship_id
        WHERE mp.status = 'pending'
          AND ($1::boolean OR mp.counterpart_ship_id::text = $2)
        ORDER BY mp.created_at DESC`,
      [isAdmin, shipId]
    );
    return NextResponse.json({ proposals: r.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load proposals (run DB migration: mirror_proposals tables)" },
      { status: 500 }
    );
  }
}
