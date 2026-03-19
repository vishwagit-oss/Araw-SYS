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
    `SELECT * FROM cash_discharge WHERE id = $1 AND ship_id = $2`,
    [id, session.ship.id]
  );

  if (session.ship.role === "admin") {
    const rAdmin = await query(`SELECT * FROM cash_discharge WHERE id = $1`, [id]);
    if (rAdmin.rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const shipId =
    session.ship.role === "admin" && body.ship_id ? body.ship_id : session.ship.id;

  const toName = String(body.to_ship ?? "").trim();
  const inserted = await query(
    `INSERT INTO cash_discharge
      (ship_id, date, to_ship, location, remark, amount_aed, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      shipId,
      body.date || null,
      toName || null,
      body.location || null,
      body.remark || null,
      body.amount_aed != null ? Number(body.amount_aed) : null,
      body.attachment_url || null,
    ]
  );

  const cashDischargeId = inserted.rows[0]?.id as string | undefined;

  // Mirroring: if TO matches a known ship, create a mirrored cash_receiving for that ship.
  if (cashDischargeId) {
    const targetShipId = await findShipIdByNameOrLogin(toName);
    if (targetShipId) {
      const sellerShipName = await getShipNameById(shipId);

      const mirrorInserted = await query(
        `INSERT INTO cash_receiving
          (ship_id, date, from_ship, location, remark, amount_aed, attachment_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          targetShipId,
          body.date || null,
          sellerShipName || null,
          body.location || null,
          body.remark || null,
          body.amount_aed != null ? Number(body.amount_aed) : null,
          body.attachment_url || null,
        ]
      );

      const cashReceivingId = mirrorInserted.rows[0]?.id as string | undefined;
      if (cashReceivingId) {
        await query(
          `INSERT INTO mirrors (source_type, source_id, target_type, target_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (source_type, source_id) DO UPDATE SET
             target_type = EXCLUDED.target_type,
             target_id = EXCLUDED.target_id`,
          ["cash_discharge", cashDischargeId, "cash_receiving", cashReceivingId]
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
      `SELECT created_at FROM cash_discharge WHERE id = $1 AND ship_id = $2`,
      [id, session.ship.id]
    );
    if (check.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const days =
      (Date.now() - new Date(check.rows[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 3) return NextResponse.json({ error: "Cannot edit after 3 days" }, { status: 403 });
  }

  await query(
    `UPDATE cash_discharge SET
      date = $2,
      to_ship = $3,
      location = $4,
      remark = $5,
      amount_aed = $6,
      attachment_url = $7,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      body.date || null,
      String(body.to_ship ?? "").trim() || null,
      body.location || null,
      body.remark || null,
      body.amount_aed != null ? Number(body.amount_aed) : null,
      body.attachment_url || null,
    ]
  );

  // Re-sync mirrored cash_receiving (if TO is a known ship).
  const updated = await query(`SELECT * FROM cash_discharge WHERE id = $1 LIMIT 1`, [id]);
  const row = updated.rows[0];
  if (row) {
    const toName = String(row.to_ship ?? "").trim();
    const sellerShipId = row.ship_id as string;
    const sellerShipName = await getShipNameById(sellerShipId);

    const existingMirror = await query(
      `SELECT target_id FROM mirrors
       WHERE source_type = $1 AND source_id = $2 AND target_type = $3
       LIMIT 1`,
      ["cash_discharge", id, "cash_receiving"]
    );
    const existingReceivingId = existingMirror.rows[0]?.target_id as string | undefined;

    const targetShipId = await findShipIdByNameOrLogin(toName);

    if (targetShipId) {
      if (existingReceivingId) {
        await query(`DELETE FROM cash_receiving WHERE id = $1`, [existingReceivingId]);
      }
      const mirrorInserted = await query(
        `INSERT INTO cash_receiving
          (ship_id, date, from_ship, location, remark, amount_aed, attachment_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          targetShipId,
          row.date || null,
          sellerShipName || null,
          row.location || null,
          row.remark || null,
          row.amount_aed != null ? Number(row.amount_aed) : null,
          row.attachment_url || null,
        ]
      );

      const cashReceivingId = mirrorInserted.rows[0]?.id as string | undefined;
      if (cashReceivingId) {
        await query(
          `INSERT INTO mirrors (source_type, source_id, target_type, target_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (source_type, source_id) DO UPDATE SET
             target_type = EXCLUDED.target_type,
             target_id = EXCLUDED.target_id`,
          ["cash_discharge", id, "cash_receiving", cashReceivingId]
        );
      }
    } else if (existingReceivingId) {
      await query(`DELETE FROM cash_receiving WHERE id = $1`, [existingReceivingId]);
      await query(
        `DELETE FROM mirrors WHERE source_type = $1 AND source_id = $2 AND target_type = $3`,
        ["cash_discharge", id, "cash_receiving"]
      );
    }
  }

  return NextResponse.json({ success: true });
}

