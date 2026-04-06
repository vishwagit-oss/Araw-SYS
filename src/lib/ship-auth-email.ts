/** Maps ship login_id (what the user types) to a unique email for Supabase Auth. */

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
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  );
}

export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}
