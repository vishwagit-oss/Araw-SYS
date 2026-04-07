/** Maps ship login_id (what the user types) to a unique email for Supabase Auth. */

/** Project URL: prefer NEXT_PUBLIC_* (browser); also accept SUPABASE_URL from some host integrations. */
export function supabaseProjectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

export function loginIdToSupabaseEmail(loginId: string): string {
  const domain =
    process.env.SHIP_AUTH_EMAIL_DOMAIN?.trim() || "ship.auth.invalid";
  const normalized = loginId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
  const local = normalized || "ship";
  return `${local}@${domain}`;
}

export function supabaseAuthConfigured(): boolean {
  return !!(supabaseProjectUrl() && supabaseAnonKey());
}

/** Publishable / anon JWT — use NEXT_PUBLIC_* on Vercel so they exist at build time, or SUPABASE_ANON_KEY if your host sets only that. */
export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}
