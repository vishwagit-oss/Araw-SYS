import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { findShipIdByNameOrLogin, getShipNameById } from "@/lib/ships-lookup";
import {
  buildCashDischargePayloadFromReceivingForm,
  createPendingProposal,
  findMatchingPendingProposalForManualCashReceiving,
  syncCashReceivingAfterPut,
} from "@/lib/mirror-proposals";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const r = await query(`SELECT * FROM cash_receiving WHERE id = $1 AND ship_id = $2`, [
    id,
    session.ship.id,
  ]);

  if (session.ship.role === "admin") {
    const rAdmin = await query(`SELECT * FROM cash_receiving WHERE id = $1`, [id]);
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

  const fromName = String(body.from_ship ?? "").trim();
  const inserted = await query(
    `INSERT INTO cash_receiving
      (ship_id, date, from_ship, location, remark, amount_aed, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      shipId,
      body.date || null,
      fromName || null,
      body.location || null,
      body.remark || null,
      body.amount_aed != null ? Number(body.amount_aed) : null,
      body.attachment_url || null,
    ]
  );

  const cashReceivingId = inserted.rows[0]?.id as string | undefined;
  let matchPendingProposalId: string | null = null;

  if (cashReceivingId) {
    const otherShipId = await findShipIdByNameOrLogin(fromName);
    if (otherShipId && otherShipId !== shipId) {
      matchPendingProposalId = await findMatchingPendingProposalForManualCashReceiving({
        postingShipId: shipId,
        initiatorShipId: otherShipId,
        date: body.date || null,
        amount_aed: body.amount_aed != null ? Number(body.amount_aed) : null,
      });
    }

    if (!matchPendingProposalId && otherShipId && otherShipId !== shipId) {
      const receivingShipName = await getShipNameById(shipId);
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: otherShipId,
        sourceType: "cash_receiving",
        sourceId: cashReceivingId,
        targetType: "cash_discharge",
        payload: buildCashDischargePayloadFromReceivingForm({
          date: body.date || null,
          location: body.location || null,
          remark: body.remark || null,
          amount_aed: body.amount_aed != null ? Number(body.amount_aed) : undefined,
          attachment_url: body.attachment_url || null,
          receivingShipName,
        }),
      });
    }
  }

  return NextResponse.json({
    success: true,
    id: cashReceivingId,
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
      `SELECT created_at FROM cash_receiving WHERE id = $1 AND ship_id = $2`,
      [id, session.ship.id]
    );
    if (check.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const days =
      (Date.now() - new Date(check.rows[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 3) return NextResponse.json({ error: "Cannot edit after 3 days" }, { status: 403 });
  }

  await query(
    `UPDATE cash_receiving SET
      date = $2,
      from_ship = $3,
      location = $4,
      remark = $5,
      amount_aed = $6,
      attachment_url = $7,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      body.date || null,
      String(body.from_ship ?? "").trim() || null,
      body.location || null,
      body.remark || null,
      body.amount_aed != null ? Number(body.amount_aed) : null,
      body.attachment_url || null,
    ]
  );

  const updated = await query(`SELECT * FROM cash_receiving WHERE id = $1 LIMIT 1`, [id]);
  const row = updated.rows[0];
  if (row) {
    await syncCashReceivingAfterPut(row);
  }

  return NextResponse.json({ success: true });
}
