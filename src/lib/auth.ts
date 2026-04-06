import { cookies } from "next/headers";
import { query } from "./db";
import { createSupabaseServerReadonlyClient } from "./supabase/server";
import { DEMO_COOKIE_NAME, SESSION_COOKIE_NAME } from "./auth.cookies";

export interface ShipUser {
  id: string;
  name: string;
  login_id: string;
  role: "ship" | "admin";
}

/** Demo users (no database / no Supabase required). */
export const DEMO_LOGINS: Record<string, { password: string; ship: ShipUser }> = {
  demo: {
    password: "demo123",
    ship: { id: "demo-ship", name: "MAHRU", login_id: "demo", role: "ship" },
  },
  demo_admin: {
    password: "demo123",
    ship: { id: "demo-admin", name: "Admin", login_id: "demo_admin", role: "admin" },
  },
};

export async function getSession(): Promise<{ ship: ShipUser; sessionId: string } | null> {
  const c = await cookies();
  const demoPayload = c.get(DEMO_COOKIE_NAME)?.value;
  if (demoPayload) {
    try {
      const ship = JSON.parse(Buffer.from(demoPayload, "base64").toString()) as ShipUser;
      if (ship?.id && ship?.name && ship?.role) {
        return { sessionId: "demo", ship };
      }
    } catch {
      // ignore
    }
  }

  try {
    let supabase;
    try {
      supabase = await createSupabaseServerReadonlyClient();
    } catch {
      return null;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const r = await query(
      `SELECT id, name, login_id, role FROM ships WHERE auth_user_id = $1 LIMIT 1`,
      [user.id]
    );
    if (r.rows.length === 0) return null;

    const row = r.rows[0];
    return {
      sessionId: user.id,
      ship: {
        id: row.id,
        name: row.name,
        login_id: row.login_id,
        role: row.role,
      },
    };
  } catch {
    return null;
  }
}

export {
  sessionCookieHeader,
  clearSessionCookie,
  demoCookieHeader,
  clearDemoCookie,
} from "./auth.cookies";

export async function getSessionIdFromCookie(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE_NAME)?.value ?? null;
}
