import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { findShipIdByNameOrLogin, getShipNameById } from "@/lib/ships-lookup";
import {
  buildInternalDischargePayloadFromCargoForm,
  createPendingProposal,
  findMatchingPendingProposalForManualCargoReceiving,
  syncCargoReceivingAfterPut,
} from "@/lib/mirror-proposals";

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
  const shipId = session.ship.role === "admin" && body.ship_id ? body.ship_id : session.ship.id;

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
  let matchPendingProposalId: string | null = null;

  if (cargoReceivingId) {
    const otherShipId = await findShipIdByNameOrLogin(fromName);
    if (otherShipId && otherShipId !== shipId) {
      matchPendingProposalId = await findMatchingPendingProposalForManualCargoReceiving({
        postingShipId: shipId,
        initiatorShipId: otherShipId,
        date: body.date || null,
        white_ig: body.white_ig != null ? Number(body.white_ig) : null,
        white_mt: body.white_mt != null ? Number(body.white_mt) : null,
        yellow_ig: body.yellow_ig != null ? Number(body.yellow_ig) : null,
        yellow_mt: body.yellow_mt != null ? Number(body.yellow_mt) : null,
      });
    }

    if (!matchPendingProposalId && otherShipId && otherShipId !== shipId) {
      const receivingShipName = await getShipNameById(shipId);
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: otherShipId,
        sourceType: "cargo_receiving",
        sourceId: cargoReceivingId,
        targetType: "internal_discharge",
        payload: buildInternalDischargePayloadFromCargoForm({
          date: body.date || null,
          location: body.location || null,
          remark: body.remark || null,
          white_ig: body.white_ig != null ? Number(body.white_ig) : undefined,
          white_mt: body.white_mt != null ? Number(body.white_mt) : undefined,
          yellow_ig: body.yellow_ig != null ? Number(body.yellow_ig) : undefined,
          yellow_mt: body.yellow_mt != null ? Number(body.yellow_mt) : undefined,
          attachment_url: body.attachment_url || null,
          receivingShipName,
        }),
      });
    }
  }

  return NextResponse.json({
    success: true,
    id: cargoReceivingId,
    ...(matchPendingProposalId && { matchPendingProposalId }),
  });
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

  const updated = await query(`SELECT * FROM cargo_receiving WHERE id = $1 LIMIT 1`, [id]);
  const row = updated.rows[0];
  if (row) {
    await syncCargoReceivingAfterPut(row);
  }
  return NextResponse.json({ success: true });
}
