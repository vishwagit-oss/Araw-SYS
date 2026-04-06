export const SESSION_COOKIE_NAME = "sea_regent_session";
export const DEMO_COOKIE_NAME = "sea_regent_demo";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const DEMO_COOKIE = DEMO_COOKIE_NAME;
const SESSION_DAYS = 7;

export function sessionCookieHeader(sessionId: string, maxAgeDays: number = SESSION_DAYS): string {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function demoCookieHeader(ship: {
  id: string;
  name: string;
  login_id: string;
  role: "ship" | "admin";
}): string {
  const payload = Buffer.from(JSON.stringify(ship)).toString("base64");
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${DEMO_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearDemoCookie(): string {
  return `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
