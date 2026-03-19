const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SHIPS = [
  { name: "MAHRU", login_id: "mahru", password: "mahru123", role: "ship" },
  { name: "PHOENIX31", login_id: "phoenix31", password: "phoenix31123", role: "ship" },
  { name: "KOKO", login_id: "koko", password: "koko123", role: "ship" },
  { name: "APRIL2", login_id: "april2", password: "april2123", role: "ship" },
  { name: "SEA REGENT", login_id: "sea_regent", password: "searegent123", role: "ship" },
  { name: "Admin", login_id: "admin", password: "admin123", role: "admin" },
];

async function main() {
  for (const s of SHIPS) {
    const password_hash = await bcrypt.hash(s.password, 10);
    await pool.query(
      `INSERT INTO ships (name, login_id, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (login_id) DO UPDATE SET
         name = $1,
         password_hash = $3,
         role = $4`,
      [s.name, s.login_id, password_hash, s.role]
    );
    console.log(`Ship/Admin: ${s.name} (login_id: ${s.login_id})`);
  }
  console.log("Seed done. Default passwords: mahru123, phoenix31123, koko123, april2123, searegent123, admin123");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
