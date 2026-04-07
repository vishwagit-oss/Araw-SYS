import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseProjectUrl } from "@/lib/ship-auth-email";

/** Attach cookie writes to this response (e.g. login / logout / password change). */
export function createSupabaseRouteHandlerClient(response: NextResponse) {
  const supabaseUrl = supabaseProjectUrl();
  if (!supabaseUrl || !supabaseAnonKey()) {
    throw new Error("Supabase env vars are not set");
  }
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Read session only (middleware does refreshes). setAll is a no-op. */
export async function createSupabaseServerReadonlyClient() {
  const supabaseUrl = supabaseProjectUrl();
  if (!supabaseUrl || !supabaseAnonKey()) {
    throw new Error("Supabase env vars are not set");
  }
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* refreshed in middleware */
      },
    },
  });
}
