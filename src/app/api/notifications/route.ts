import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "1";

  try {
    if (countOnly) {
      const r = await query(
        `SELECT COUNT(*)::int AS n FROM ship_notifications
         WHERE ship_id = $1 AND read_at IS NULL`,
        [session.ship.id]
      );
      return NextResponse.json({ unread: r.rows[0]?.n ?? 0 });
    }
    const r = await query(
      `SELECT * FROM ship_notifications
       WHERE ship_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [session.ship.id]
    );
    return NextResponse.json({ notifications: r.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Notifications unavailable (run DB migration)", notifications: [], unread: 0 },
      { status: 200 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length > 0) {
      await query(
        `UPDATE ship_notifications SET read_at = now()
         WHERE ship_id = $1 AND id = ANY($2::uuid[])`,
        [session.ship.id, ids]
      );
    } else {
      await query(`UPDATE ship_notifications SET read_at = now() WHERE ship_id = $1 AND read_at IS NULL`, [
        session.ship.id,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
