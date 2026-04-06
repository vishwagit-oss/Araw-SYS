import { NextResponse } from "next/server";
import { clearSessionCookie, clearDemoCookie } from "@/lib/auth.cookies";
import { supabaseAuthConfigured } from "@/lib/ship-auth-email";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  if (supabaseAuthConfigured()) {
    const supabase = createSupabaseRouteHandlerClient(response);
    await supabase.auth.signOut();
  }

  response.headers.append("Set-Cookie", clearSessionCookie());
  response.headers.append("Set-Cookie", clearDemoCookie());

  return response;
}
