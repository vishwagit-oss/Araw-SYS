import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.ship.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const r = await query(
      `SELECT s.id, s.name, s.login_id, u.last_sign_in_at AS logged_in_at
       FROM ships s
       INNER JOIN auth.users u ON u.id = s.auth_user_id
       WHERE s.auth_user_id IS NOT NULL
       ORDER BY u.last_sign_in_at DESC NULLS LAST
       LIMIT 50`
    );
    return NextResponse.json({ sessions: r.rows });
  } catch (e) {
    console.warn("[active-sessions] auth.users join not available:", e);
    try {
      const r = await query(
        `SELECT s.id, s.name, s.login_id, ss.created_at AS logged_in_at
         FROM sessions ss
         JOIN ships s ON s.id = ss.ship_id
         WHERE ss.expires_at > now()
         ORDER BY ss.created_at DESC`
      );
      return NextResponse.json({
        sessions: r.rows,
        note: "Showing legacy session table (auth.users unavailable).",
      });
    } catch {
      return NextResponse.json({ sessions: [] });
    }
  }
}
