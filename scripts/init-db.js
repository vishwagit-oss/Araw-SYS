const { readFileSync } = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

const { createPoolFromDatabaseUrl } = require("./create-pg-pool");

async function main() {
  const pool = await createPoolFromDatabaseUrl();
  const schema = readFileSync(
    path.join(__dirname, "..", "src", "lib", "schema.sql"),
    "utf8"
  );
  await pool.query(schema);
  console.log("Schema created.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
