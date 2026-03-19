const { readFileSync } = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
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
