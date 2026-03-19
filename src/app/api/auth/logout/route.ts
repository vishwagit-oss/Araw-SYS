import { NextResponse } from "next/server";
import { getSessionIdFromCookie, clearSessionCookie, clearDemoCookie } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST() {
  const sessionId = await getSessionIdFromCookie();
  if (sessionId && sessionId !== "demo") {
    try {
      await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    } catch {
      // ignore
    }
  }
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  res.headers.append("Set-Cookie", clearDemoCookie());
  return res;
}
