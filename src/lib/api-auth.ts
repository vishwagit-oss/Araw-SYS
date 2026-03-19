import { NextResponse } from "next/server";
import { verifyCognitoToken, getTokenFromHeader } from "./verify-token";

export async function requireAuth(authHeader: string | null): Promise<
  | { sub: string; email?: string; error?: never }
  | { sub?: never; error: NextResponse }
> {
  const token = getTokenFromHeader(authHeader);
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const payload = await verifyCognitoToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { sub: payload.sub, email: payload.email };
}
