/**
 * Build a pg Pool that prefers IPv4 for the hostname (fixes Windows ENETUNREACH
 * when Supabase direct DB resolves to IPv6-only from your network).
 */
const dns = require("dns");
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const { parse } = require("pg-connection-string");
const { Pool } = require("pg");

async function createPoolFromDatabaseUrl() {
  const connectionString = (process.env.DATABASE_URL || "").trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing or empty in .env.local.\n" +
        "Add one line (no line break in the middle), e.g.:\n" +
        'DATABASE_URL="postgresql://postgres.PROJECTREF:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres"'
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new Error(
      "DATABASE_URL must start with postgresql:// (got: " +
        connectionString.slice(0, 24) +
        "…)"
    );
  }

  const parsed = parse(connectionString);
  let host = parsed.host;
  if (!host) {
    throw new Error("DATABASE_URL has no host");
  }

  const hostUnbracket = host.replace(/^\[|\]$/g, "");
  const isIPv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostUnbracket);
  /** IPv6 in URL — breaks on many Windows networks (ENETUNREACH). */
  const isIPv6Literal = !isIPv4Literal && hostUnbracket.includes(":");

  if (isIPv6Literal) {
    throw new Error(
      `DATABASE_URL points at an IPv6 address (${hostUnbracket.slice(0, 24)}…), not a hostname.\n\n` +
        `Common causes:\n` +
        `  • .env.local still has a direct/old URL, or the password broke parsing (use URL-encoding for @ # : / etc.).\n` +
        `  • Windows or the shell already had DATABASE_URL set; scripts now force .env.local to win (override:true).\n` +
        `  • Only one line: DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-....pooler.supabase.com:6543/postgres\n\n` +
        `Use Supabase → Database → Connection string → Transaction (pooler), host must be *.pooler.supabase.com.\n` +
        `Or paste src/lib/schema.sql into Supabase → SQL Editor.\n\n` +
        `Sanity check (host only): run  node -e "require('dotenv').config({path:'.env.local',override:true});require('pg-connection-string').parse(process.env.DATABASE_URL||'').host"`
    );
  }

  let connectHost = hostUnbracket;
  const originalHost = connectHost;

  if (
    !isIPv4Literal &&
    process.env.DB_INIT_FORCE_IPV4 !== "0"
  ) {
    let v4List = [];
    try {
      v4List = await dns.promises.resolve4(connectHost);
    } catch {
      v4List = [];
    }

    if (v4List.length > 0) {
      console.warn(
        `[pg] Using IPv4 ${v4List[0]} for "${originalHost}" (avoids broken IPv6 on some networks).`
      );
      connectHost = v4List[0];
    } else {
      const isSupabaseDirect =
        /\.supabase\.co$/i.test(connectHost) && !/pooler\./i.test(connectHost);
      if (isSupabaseDirect) {
        throw new Error(
          `Database host "${originalHost}" has no IPv4 (A) address from your network — direct Supabase DB is often IPv6-only.\n\n` +
            `Fix: In Supabase → Project Settings → Database → Connection string, choose ` +
            `URI and Mode "Transaction" (pooler). Use host like "*.pooler.supabase.com" and port 6543.\n` +
            `Replace DATABASE_URL in .env.local with that URI, then run again.\n\n` +
            `Or skip CLI: paste src/lib/schema.sql into Supabase → SQL Editor → Run.`
        );
      }
      console.warn(
        `[pg] No A record for "${originalHost}"; connecting with hostname (may use IPv6).`
      );
    }
  }

  console.warn(`[pg] Connecting to ${connectHost}:${parsed.port || 5432} db=${parsed.database}`);

  return new Pool({
    user: parsed.user,
    password: parsed.password,
    host: connectHost,
    port: parsed.port ? Number(parsed.port) : 5432,
    database: parsed.database,
    ssl: { rejectUnauthorized: false },
  });
}

module.exports = { createPoolFromDatabaseUrl };
