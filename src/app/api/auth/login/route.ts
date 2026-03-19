import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { sessionCookieHeader, DEMO_LOGINS, demoCookieHeader } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login_id = String(body.login_id ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!login_id || !password) {
      return NextResponse.json(
        { error: "Login ID and password required" },
        { status: 400 }
      );
    }

    // Demo logins (no database required)
    const demo = DEMO_LOGINS[login_id];
    if (demo && demo.password === password) {
      const res = NextResponse.json({
        success: true,
        ship: demo.ship,
      });
      res.headers.set("Set-Cookie", demoCookieHeader(demo.ship));
      return res;
    }

    const r = await query(
      "SELECT id, name, login_id, password_hash, role FROM ships WHERE login_id = $1",
      [login_id]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Invalid login ID or password" }, { status: 401 });
    }

    const ship = r.rows[0];
    const match = await bcrypt.compare(password, ship.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Invalid login ID or password" }, { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await query(
      "INSERT INTO sessions (id, ship_id, expires_at) VALUES ($1, $2, $3)",
      [sessionId, ship.id, expiresAt]
    );

    const res = NextResponse.json({
      success: true,
      ship: { id: ship.id, name: ship.name, login_id: ship.login_id, role: ship.role },
    });
    res.headers.set("Set-Cookie", sessionCookieHeader(sessionId));
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
