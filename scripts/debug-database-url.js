/**
 * Shows how DATABASE_URL is split (masks password). Run: npm run db:debug-url
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

const { parse } = require("pg-connection-string");

const envPath = path.join(__dirname, "..", ".env.local");
const raw = process.env.DATABASE_URL || "";

console.log("--- DATABASE_URL diagnostics ---\n");

if (!raw) {
  console.log("DATABASE_URL is empty after loading .env.local");
  process.exit(1);
}

// Inspect raw file line (detect # comment truncation, quotes)
try {
  const text = fs.readFileSync(envPath, "utf8");
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^\s*DATABASE_URL\s*=/.test(l));
  if (idx === -1) {
    console.log("No DATABASE_URL= line found in .env.local");
  } else {
    const line = lines[idx];
    const trimmed = line.trim();
    const isQuoted = /^\s*DATABASE_URL\s*=\s*["']/.test(line);
    console.log("DATABASE_URL line in file is quoted:", isQuoted);
    if (!isQuoted && /#\s*\S/.test(line.split("=").slice(1).join("="))) {
      console.log(
        "\n⚠ PROBLEM: Unquoted DATABASE_URL line looks like it contains # .\n" +
          "   In .env files, # starts a COMMENT — everything after it is IGNORED.\n" +
          "   If your password has # use %23, and/or wrap the whole URL in double quotes:\n" +
          '   DATABASE_URL="postgresql://..."\n'
      );
    }
    const afterEq = line.indexOf("=");
    const preview = afterEq >= 0 ? line.slice(afterEq + 1).trim() : "";
    const masked = preview.replace(/:([^/"'\s]+)(@)/, ":****$2");
    console.log("File line preview (password masked):", masked.slice(0, 100) + (masked.length > 100 ? "..." : ""));
  }
} catch (e) {
  console.log("Could not read .env.local:", e.message);
}

console.log("\nLoaded value length:", raw.length);
console.log("Contains pooler.supabase.com:", /pooler\.supabase\.com/i.test(raw));
console.log("Contains literal 2600: (bad):", /2600:/.test(raw));

const atCount = (raw.match(/@/g) || []).length;
console.log("Number of @ in loaded URL:", atCount);
if (atCount > 1) {
  console.log(
    "⚠ If password has @ use %40 — extra @ breaks host parsing."
  );
}

const afterLastAt = raw.slice(raw.lastIndexOf("@") + 1);
const portMatch = afterLastAt.match(/^([^/?]+)(?::(\d+))?(\/|$)/);
const hostSegment = portMatch ? portMatch[1] : "(could not parse)";
const portSegment = portMatch && portMatch[2] ? portMatch[2] : "(default)";

console.log("\nHost segment (after last @):", hostSegment);
console.log("Port:", portSegment);

const parsed = parse(raw);
console.log("pg-connection-string .host:", parsed.host);
if (parsed.host === "base") {
  console.log(
    "\n⚠ Host 'base' almost always means DATABASE_URL is empty, broken, or not a postgresql:// URI.\n" +
      "   Fix .env.local: one full line DATABASE_URL=\"postgresql://user:pass@host:6543/postgres\""
  );
}

console.log("\n--- Expected ---");
console.log("Host = aws-….pooler.supabase.com, port 6543");
if (String(parsed.host).includes("2600")) {
  console.log(
    "\n✗ Still broken. Fix:\n" +
      "  1) Copy URI again: Supabase → Database → Transaction pooler.\n" +
      "  2) Wrap line in double quotes in .env.local if password has # = % etc.\n" +
      "  3) Encode password: @→%40  #→%23  :→%3A  /→%2F  %→%25"
  );
}
console.log("-----------------------------------");
