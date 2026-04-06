import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { findShipIdByNameOrLogin, getShipNameById } from "@/lib/ships-lookup";
import {
  buildCargoReceivingPayloadFromDischargeForm,
  createPendingProposal,
  findMatchingPendingProposalForManualInternalDischarge,
  syncInternalDischargeAfterPut,
} from "@/lib/mirror-proposals";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const r = await query(`SELECT * FROM internal_discharge WHERE id = $1 AND ship_id = $2`, [
    id,
    session.ship.id,
  ]);

  if (session.ship.role === "admin") {
    const rAdmin = await query(`SELECT * FROM internal_discharge WHERE id = $1`, [id]);
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

  const toName = String(body.to ?? "").trim();
  const inserted = await query(
    `INSERT INTO internal_discharge
      (ship_id, ship_name_other, date, "to", location, remark,
       white_ig, white_mt, yellow_ig, yellow_mt, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      shipId,
      body.ship_name_other ?? null,
      body.date || null,
      toName || null,
      body.location || null,
      body.remark || null,
      body.white_ig != null ? Number(body.white_ig) : null,
      body.white_mt != null ? Number(body.white_mt) : null,
      body.yellow_ig != null ? Number(body.yellow_ig) : null,
      body.yellow_mt != null ? Number(body.yellow_mt) : null,
      body.attachment_url || null,
    ]
  );

  const internalDischargeId = inserted.rows[0]?.id as string | undefined;
  let matchPendingProposalId: string | null = null;

  if (internalDischargeId) {
    const otherShipId = await findShipIdByNameOrLogin(toName);
    if (otherShipId && otherShipId !== shipId) {
      matchPendingProposalId = await findMatchingPendingProposalForManualInternalDischarge({
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
      const sellerShipName = await getShipNameById(shipId);
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: otherShipId,
        sourceType: "internal_discharge",
        sourceId: internalDischargeId,
        targetType: "cargo_receiving",
        payload: buildCargoReceivingPayloadFromDischargeForm({
          date: body.date || null,
          location: body.location || null,
          remark: body.remark || null,
          white_ig: body.white_ig != null ? Number(body.white_ig) : undefined,
          white_mt: body.white_mt != null ? Number(body.white_mt) : undefined,
          yellow_ig: body.yellow_ig != null ? Number(body.yellow_ig) : undefined,
          yellow_mt: body.yellow_mt != null ? Number(body.yellow_mt) : undefined,
          attachment_url: body.attachment_url || null,
          fromShipName: sellerShipName,
        }),
      });
    }
  }

  return NextResponse.json({
    success: true,
    id: internalDischargeId,
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
      `SELECT created_at FROM internal_discharge WHERE id = $1 AND ship_id = $2`,
      [id, session.ship.id]
    );
    if (check.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const days =
      (Date.now() - new Date(check.rows[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 3) return NextResponse.json({ error: "Cannot edit after 3 days" }, { status: 403 });
  }

  await query(
    `UPDATE internal_discharge SET
      ship_name_other = $2,
      date = $3,
      "to" = $4,
      location = $5,
      remark = $6,
      white_ig = $7,
      white_mt = $8,
      yellow_ig = $9,
      yellow_mt = $10,
      attachment_url = $11,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      body.ship_name_other ?? null,
      body.date || null,
      String(body.to ?? "").trim() || null,
      body.location || null,
      body.remark || null,
      body.white_ig != null ? Number(body.white_ig) : null,
      body.white_mt != null ? Number(body.white_mt) : null,
      body.yellow_ig != null ? Number(body.yellow_ig) : null,
      body.yellow_mt != null ? Number(body.yellow_mt) : null,
      body.attachment_url || null,
    ]
  );

  const updated = await query(`SELECT * FROM internal_discharge WHERE id = $1 LIMIT 1`, [id]);
  const row = updated.rows[0];
  if (row) {
    await syncInternalDischargeAfterPut(row);
  }

  return NextResponse.json({ success: true });
}
