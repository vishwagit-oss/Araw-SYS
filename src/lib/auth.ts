import { cookies } from "next/headers";
import { query } from "./db";

const SESSION_COOKIE = "sea_regent_session";
const DEMO_COOKIE = "sea_regent_demo";
const SESSION_DAYS = 7;

export interface ShipUser {
  id: string;
  name: string;
  login_id: string;
  role: "ship" | "admin";
}

/** Demo users (no database required). For demo only. */
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

export async function getSessionIdFromCookie(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<{ ship: ShipUser; sessionId: string } | null> {
  const c = await cookies();
  const demoPayload = c.get(DEMO_COOKIE)?.value;
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

  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) return null;

  try {
    const r = await query(
      `SELECT s.id, s.name, s.login_id, s.role
       FROM sessions ss
       JOIN ships s ON s.id = ss.ship_id
       WHERE ss.id = $1 AND ss.expires_at > now()`,
      [sessionId]
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    return {
      sessionId,
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

export function sessionCookieHeader(sessionId: string, maxAgeDays: number = SESSION_DAYS): string {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function demoCookieHeader(ship: ShipUser): string {
  const payload = Buffer.from(JSON.stringify(ship)).toString("base64");
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${DEMO_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearDemoCookie(): string {
  return `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
