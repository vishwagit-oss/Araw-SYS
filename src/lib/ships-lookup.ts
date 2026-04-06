import { query } from "./db";

export async function findShipIdByNameOrLogin(nameOrLogin: string): Promise<string | null> {
  const v = nameOrLogin.trim();
  if (!v) return null;
  const r = await query(
    `SELECT id FROM ships
     WHERE role = 'ship'
       AND (lower(name) = lower($1) OR lower(login_id) = lower($1))
     LIMIT 1`,
    [v]
  );
  return r.rows[0]?.id ?? null;
}

export async function getShipNameById(shipId: string): Promise<string> {
  const r = await query(`SELECT name FROM ships WHERE id = $1 LIMIT 1`, [shipId]);
  return r.rows[0]?.name ?? "";
}

export async function getAdminShipIds(): Promise<string[]> {
  const r = await query(`SELECT id FROM ships WHERE role = 'admin'`);
  return r.rows.map((row: { id: string }) => row.id);
}
