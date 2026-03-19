import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

async function findShipIdByNameOrLogin(nameOrLogin: string): Promise<string | null> {
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

async function getShipNameById(shipId: string): Promise<string> {
  const r = await query(`SELECT name FROM ships WHERE id = $1 LIMIT 1`, [shipId]);
  return r.rows[0]?.name ?? "";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const r = await query(
    "SELECT * FROM cargo_receiving WHERE id = $1 AND ship_id = $2",
    [id, session.ship.id]
  );
  if (session.ship.role === "admin") {
    const rAdmin = await query("SELECT * FROM cargo_receiving WHERE id = $1", [id]);
    if (rAdmin.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rAdmin.rows[0]);
  }
  if (r.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = r.rows[0];
  const created = new Date(row.created_at);
  const days = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  if (days > 3) return NextResponse.json({ error: "Cannot edit after 3 days" }, { status: 403 });
  return NextResponse.json(row);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const shipId = session.ship.role === "admin" && body.ship_id
    ? body.ship_id
    : session.ship.id;

  const fromName = String(body.from ?? "").trim();
  const inserted = await query(
    `INSERT INTO cargo_receiving
      (ship_id, ship_name_other, date, "from", location, remark,
       white_ig, white_mt, white_price_aed,
       yellow_ig, yellow_mt, yellow_price_aed,
       attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      shipId,
      body.ship_name_other ?? null,
      body.date || null,
      fromName || null,
      body.location || null,
      body.remark || null,
      body.white_ig != null ? Number(body.white_ig) : null,
      body.white_mt != null ? Number(body.white_mt) : null,
      body.white_price_aed != null ? Number(body.white_price_aed) : null,
      body.yellow_ig != null ? Number(body.yellow_ig) : null,
      body.yellow_mt != null ? Number(body.yellow_mt) : null,
      body.yellow_price_aed != null ? Number(body.yellow_price_aed) : null,
      body.attachment_url || null,
    ]
  );

  const cargoReceivingId = inserted.rows[0]?.id as string | undefined;

  // Mirroring: if FROM is a known ship, create an internal_discharge for that ship.
  // If FROM is only a client name, we store it as text only and do not mirror.
  if (cargoReceivingId) {
    const targetShipId = await findShipIdByNameOrLogin(fromName);
    if (targetShipId) {
      const receivingShipName = await getShipNameById(shipId);

      const mirrorInserted = await query(
        `INSERT INTO internal_discharge
          (ship_id, ship_name_other, date, "to", location, remark,
           white_ig, white_mt,
           yellow_ig, yellow_mt,
           attachment_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          targetShipId,
          null,
          body.date || null,
          receivingShipName || null,
          body.location || null,
          body.remark || null,
          body.white_ig != null ? Number(body.white_ig) : null,
          body.white_mt != null ? Number(body.white_mt) : null,
          body.yellow_ig != null ? Number(body.yellow_ig) : null,
          body.yellow_mt != null ? Number(body.yellow_mt) : null,
          body.attachment_url || null,
        ]
      );

      const internalDischargeId = mirrorInserted.rows[0]?.id as string | undefined;
      if (internalDischargeId) {
        await query(
          `INSERT INTO mirrors (source_type, source_id, target_type, target_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (source_type, source_id) DO UPDATE SET
             target_type = EXCLUDED.target_type,
             target_id = EXCLUDED.target_id`,
          ["cargo_receiving", cargoReceivingId, "internal_discharge", internalDischargeId]
        );
      }
    }
  }
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (session.ship.role !== "admin") {
    const check = await query(
      "SELECT created_at FROM cargo_receiving WHERE id = $1 AND ship_id = $2",
      [id, session.ship.id]
    );
    if (check.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const days = (Date.now() - new Date(check.rows[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 3) return NextResponse.json({ error: "Cannot edit after 3 days" }, { status: 403 });
  }

  await query(
    `UPDATE cargo_receiving SET
      ship_name_other = $2, date = $3, "from" = $4, location = $5, remark = $6,
      white_ig = $7, white_mt = $8, white_price_aed = $9, yellow_ig = $10, yellow_mt = $11, yellow_price_aed = $12,
      attachment_url = $13, updated_at = now()
     WHERE id = $1`,
    [
      id,
      body.ship_name_other ?? null,
      body.date || null,
      String(body.from ?? "").trim() || null,
      body.location || null,
      body.remark || null,
      body.white_ig != null ? Number(body.white_ig) : null,
      body.white_mt != null ? Number(body.white_mt) : null,
      body.white_price_aed != null ? Number(body.white_price_aed) : null,
      body.yellow_ig != null ? Number(body.yellow_ig) : null,
      body.yellow_mt != null ? Number(body.yellow_mt) : null,
      body.yellow_price_aed != null ? Number(body.yellow_price_aed) : null,
      body.attachment_url || null,
    ]
  );

  // Keep mirrored internal_discharge consistent (if FROM matches a known ship).
  const updated = await query(`SELECT * FROM cargo_receiving WHERE id = $1 LIMIT 1`, [id]);
  const row = updated.rows[0];
  if (row) {
    const fromName = String(row.from ?? "").trim();
    const receivingShipId = row.ship_id as string;
    const receivingShipName = await getShipNameById(receivingShipId);

    const existingMirror = await query(
      `SELECT target_id FROM mirrors
       WHERE source_type = $1 AND source_id = $2 AND target_type = $3
       LIMIT 1`,
      ["cargo_receiving", id, "internal_discharge"]
    );
    const existingInternalId = existingMirror.rows[0]?.target_id as string | undefined;

    const targetShipId = await findShipIdByNameOrLogin(fromName);

    if (targetShipId) {
      // Recreate mirrored discharge if needed (simple + consistent).
      if (existingInternalId) {
        await query(`DELETE FROM internal_discharge WHERE id = $1`, [existingInternalId]);
      }

      const mirrorInserted = await query(
        `INSERT INTO internal_discharge
          (ship_id, ship_name_other, date, "to", location, remark,
           white_ig, white_mt,
           yellow_ig, yellow_mt,
           attachment_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          targetShipId,
          null,
          row.date || null,
          receivingShipName || null,
          row.location || null,
          row.remark || null,
          row.white_ig != null ? Number(row.white_ig) : null,
          row.white_mt != null ? Number(row.white_mt) : null,
          row.yellow_ig != null ? Number(row.yellow_ig) : null,
          row.yellow_mt != null ? Number(row.yellow_mt) : null,
          row.attachment_url || null,
        ]
      );

      const internalDischargeId = mirrorInserted.rows[0]?.id as string | undefined;
      if (internalDischargeId) {
        await query(
          `INSERT INTO mirrors (source_type, source_id, target_type, target_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (source_type, source_id) DO UPDATE SET
             target_type = EXCLUDED.target_type,
             target_id = EXCLUDED.target_id`,
          ["cargo_receiving", id, "internal_discharge", internalDischargeId]
        );
      }
    } else if (existingInternalId) {
      await query(`DELETE FROM internal_discharge WHERE id = $1`, [existingInternalId]);
      await query(
        `DELETE FROM mirrors WHERE source_type = $1 AND source_id = $2 AND target_type = $3`,
        ["cargo_receiving", id, "internal_discharge"]
      );
    }
  }
  return NextResponse.json({ success: true });
}
