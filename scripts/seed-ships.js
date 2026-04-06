/**
 * Seeds ships + Supabase Auth users (same passwords as before).
 * Requires: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SHIP_AUTH_EMAIL_DOMAIN (must match app env for login)
 */
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

const { createClient } = require("@supabase/supabase-js");
const { createPoolFromDatabaseUrl } = require("./create-pg-pool");

const SHIPS = [
  { name: "MAHRU", login_id: "mahru", password: "mahru123", role: "ship" },
  { name: "PHOENIX31", login_id: "phoenix31", password: "phoenix31123", role: "ship" },
  { name: "KOKO", login_id: "koko", password: "koko123", role: "ship" },
  { name: "APRIL2", login_id: "april2", password: "april2123", role: "ship" },
  { name: "SEA REGENT", login_id: "sea_regent", password: "searegent123", role: "ship" },
  { name: "Admin", login_id: "admin", password: "admin123", role: "admin" },
];

function loginIdToSupabaseEmail(loginId) {
  const domain = process.env.SHIP_AUTH_EMAIL_DOMAIN?.trim() || "ship.auth.invalid";
  const normalized = String(loginId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
  const local = normalized || "ship";
  return `${local}@${domain}`;
}

async function ensureAuthUser(supabase, login_id, password) {
  const email = loginIdToSupabaseEmail(login_id);
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { login_id, app: "sea-regent" },
  });

  if (!createErr && created?.user?.id) {
    return created.user.id;
  }

  const msg = createErr?.message ?? "";
  if (/already|registered|exists/i.test(msg)) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      console.error("listUsers:", listErr);
      return null;
    }
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found?.id) return null;
    await supabase.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: { login_id, app: "sea-regent" },
    });
    return found.id;
  }

  console.error(`createUser ${login_id}:`, createErr);
  return null;
}

async function main() {
  const pool = await createPoolFromDatabaseUrl();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const s of SHIPS) {
    await pool.query(
      `INSERT INTO ships (name, login_id, role, password_hash)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (login_id) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role`,
      [s.name, s.login_id, s.role]
    );

    const authUserId = await ensureAuthUser(supabase, s.login_id, s.password);
    if (!authUserId) {
      console.error(`Failed Auth user for ${s.login_id}`);
      continue;
    }

    await pool.query(`UPDATE ships SET auth_user_id = $1, password_hash = NULL WHERE login_id = $2`, [
      authUserId,
      s.login_id,
    ]);

    console.log(`${s.name} (login_id: ${s.login_id}) → ${loginIdToSupabaseEmail(s.login_id)}`);
  }

  console.log(
    "\nDone. Use ship Login ID + password on /login. Set the same SHIP_AUTH_EMAIL_DOMAIN in Vercel as here if you override it."
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
