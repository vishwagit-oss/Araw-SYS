import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { DEMO_LOGINS, demoCookieHeader } from "@/lib/auth";
import { loginIdToSupabaseEmail, supabaseAuthConfigured } from "@/lib/ship-auth-email";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

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

    const demo = DEMO_LOGINS[login_id];
    if (demo && demo.password === password) {
      const res = NextResponse.json({
        success: true,
        ship: demo.ship,
      });
      res.headers.set("Set-Cookie", demoCookieHeader(demo.ship));
      return res;
    }

    if (!supabaseAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or ANON_KEY), link ships with auth_user_id, and redeploy.",
        },
        { status: 503 }
      );
    }

    const r = await query(
      `SELECT id, name, login_id, role, auth_user_id FROM ships WHERE login_id = $1`,
      [login_id]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Invalid login ID or password" }, { status: 401 });
    }

    const ship = r.rows[0] as {
      id: string;
      name: string;
      login_id: string;
      role: string;
      auth_user_id: string | null;
    };

    if (!ship.auth_user_id) {
      return NextResponse.json(
        {
          error:
            "This account is not linked to Supabase Auth yet. Run: npm run db:seed (requires SUPABASE_SERVICE_ROLE_KEY) or link auth_user_id in the database.",
        },
        { status: 401 }
      );
    }

    const email = loginIdToSupabaseEmail(login_id);

    const response = NextResponse.json({
      success: true,
      ship: {
        id: ship.id,
        name: ship.name,
        login_id: ship.login_id,
        role: ship.role,
      },
    });

    const supabase = createSupabaseRouteHandlerClient(response);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.warn("[auth/login] Supabase signIn:", error?.message);
      return NextResponse.json({ error: "Invalid login ID or password" }, { status: 401 });
    }

    if (data.user.id !== ship.auth_user_id) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account misconfigured (auth user does not match ship). Contact admin." },
        { status: 401 }
      );
    }

    return response;
  } catch (e) {
    console.error("[auth/login]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("DATABASE_URL") || msg.includes("database unavailable")) {
      return NextResponse.json(
        {
          error:
            "Database is not configured or unreachable. Set DATABASE_URL on the host (e.g. Vercel → Settings → Environment Variables) and redeploy.",
        },
        { status: 503 }
      );
    }
    if (/ECONNREFUSED|ETIMEDOUT|getaddrinfo|timeout/i.test(msg)) {
      return NextResponse.json(
        { error: "Cannot reach the database. Check DATABASE_URL, network access, and SSL settings." },
        { status: 503 }
      );
    }
    if (/relation .* does not exist|42P01/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. Run schema initialization against this DATABASE (e.g. npm run db:init).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
