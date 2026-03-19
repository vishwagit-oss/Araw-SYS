import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({
      ship: session.ship,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
