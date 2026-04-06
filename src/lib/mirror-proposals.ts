import { query } from "./db";
import { findShipIdByNameOrLogin, getAdminShipIds, getShipNameById } from "./ships-lookup";

export type MirrorSourceType =
  | "cargo_receiving"
  | "internal_discharge"
  | "cash_receiving"
  | "cash_discharge";

export type MirrorTargetType =
  | "internal_discharge"
  | "cargo_receiving"
  | "cash_discharge"
  | "cash_receiving";

const NUM_EPS = 0.02;

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function numsMatch(a: unknown, b: unknown): boolean {
  const x = n(a);
  const y = n(b);
  if (x == null && y == null) return true;
  if (x == null || y == null) return false;
  return Math.abs(x - y) <= NUM_EPS;
}

function datesMatch(d1: unknown, d2: unknown): boolean {
  if (d1 == null && d2 == null) return true;
  if (!d1 || !d2) return false;
  const a = new Date(String(d1)).toISOString().slice(0, 10);
  const b = new Date(String(d2)).toISOString().slice(0, 10);
  return a === b;
}

async function notifyShips(
  shipIds: string[],
  proposalId: string,
  kind: string,
  title: string,
  body: string
): Promise<void> {
  const ids = Array.from(new Set(shipIds.filter(Boolean)));
  for (const shipId of ids) {
    await query(
      `INSERT INTO ship_notifications (ship_id, proposal_id, kind, title, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [shipId, proposalId, kind, title, body]
    );
  }
}

export async function supersedePendingForSource(
  sourceType: MirrorSourceType,
  sourceId: string
): Promise<void> {
  await query(
    `UPDATE mirror_proposals SET status = 'superseded', updated_at = now()
     WHERE source_type = $1 AND source_id = $2 AND status = 'pending'`,
    [sourceType, sourceId]
  );
}

export async function createPendingProposal(params: {
  initiatorShipId: string;
  counterpartShipId: string;
  sourceType: MirrorSourceType;
  sourceId: string;
  targetType: MirrorTargetType;
  payload: Record<string, unknown>;
}): Promise<string> {
  const {
    initiatorShipId,
    counterpartShipId,
    sourceType,
    sourceId,
    targetType,
    payload,
  } = params;

  await supersedePendingForSource(sourceType, sourceId);

  const ins = await query(
    `INSERT INTO mirror_proposals
      (initiator_ship_id, counterpart_ship_id, source_type, source_id, target_type, status, payload)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb)
     RETURNING id`,
    [
      initiatorShipId,
      counterpartShipId,
      sourceType,
      sourceId,
      targetType,
      JSON.stringify(payload),
    ]
  );
  const proposalId = ins.rows[0].id as string;

  const initiatorName = await getShipNameById(initiatorShipId);
  const counterpartName = await getShipNameById(counterpartShipId);
  const label = `${sourceType.replace(/_/g, " ")} → ${targetType.replace(/_/g, " ")}`;

  await notifyShips(
    [counterpartShipId],
    proposalId,
    "pending_confirmation",
    `Confirm transfer from ${initiatorName}`,
    `${counterpartName}: ${initiatorName} recorded ${label}. Open Pending confirmations to approve or reject.`
  );

  const admins = await getAdminShipIds();
  const adminTargets = admins.filter((id) => id !== counterpartShipId);
  if (adminTargets.length > 0) {
    await notifyShips(
      adminTargets,
      proposalId,
      "pending_admin",
      `Admin: pending ${label}`,
      `${initiatorName} → ${counterpartName}. Awaiting counterpart or your approval.`
    );
  }

  return proposalId;
}

export function buildInternalDischargePayloadFromCargoForm(body: {
  date?: string | null;
  location?: string | null;
  remark?: string | null;
  white_ig?: number | null;
  white_mt?: number | null;
  yellow_ig?: number | null;
  yellow_mt?: number | null;
  attachment_url?: string | null;
  receivingShipName: string;
}): Record<string, unknown> {
  return {
    date: body.date || null,
    to: body.receivingShipName || null,
    location: body.location || null,
    remark: body.remark || null,
    white_ig: body.white_ig ?? null,
    white_mt: body.white_mt ?? null,
    yellow_ig: body.yellow_ig ?? null,
    yellow_mt: body.yellow_mt ?? null,
    attachment_url: body.attachment_url || null,
    ship_name_other: null,
  };
}

export function buildCargoReceivingPayloadFromDischargeForm(body: {
  date?: string | null;
  location?: string | null;
  remark?: string | null;
  white_ig?: number | null;
  white_mt?: number | null;
  yellow_ig?: number | null;
  yellow_mt?: number | null;
  attachment_url?: string | null;
  fromShipName: string;
}): Record<string, unknown> {
  return {
    date: body.date || null,
    from: body.fromShipName || null,
    location: body.location || null,
    remark: body.remark || null,
    white_ig: body.white_ig ?? null,
    white_mt: body.white_mt ?? null,
    white_price_aed: null,
    yellow_ig: body.yellow_ig ?? null,
    yellow_mt: body.yellow_mt ?? null,
    yellow_price_aed: null,
    attachment_url: body.attachment_url || null,
    ship_name_other: null,
  };
}

export function buildCashDischargePayloadFromReceivingForm(body: {
  date?: string | null;
  location?: string | null;
  remark?: string | null;
  amount_aed?: number | null;
  attachment_url?: string | null;
  receivingShipName: string;
}): Record<string, unknown> {
  return {
    date: body.date || null,
    to_ship: body.receivingShipName || null,
    location: body.location || null,
    remark: body.remark || null,
    amount_aed: body.amount_aed ?? null,
    attachment_url: body.attachment_url || null,
  };
}

export function buildCashReceivingPayloadFromDischargeForm(body: {
  date?: string | null;
  location?: string | null;
  remark?: string | null;
  amount_aed?: number | null;
  attachment_url?: string | null;
  fromShipName: string;
}): Record<string, unknown> {
  return {
    date: body.date || null,
    from_ship: body.fromShipName || null,
    location: body.location || null,
    remark: body.remark || null,
    amount_aed: body.amount_aed ?? null,
    attachment_url: body.attachment_url || null,
  };
}

async function insertTargetRow(
  targetType: MirrorTargetType,
  counterpartShipId: string,
  payload: Record<string, unknown>
): Promise<string> {
  if (targetType === "internal_discharge") {
    const r = await query(
      `INSERT INTO internal_discharge
        (ship_id, ship_name_other, date, "to", location, remark,
         white_ig, white_mt, yellow_ig, yellow_mt, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        counterpartShipId,
        payload.ship_name_other ?? null,
        payload.date ?? null,
        payload.to ?? null,
        payload.location ?? null,
        payload.remark ?? null,
        n(payload.white_ig),
        n(payload.white_mt),
        n(payload.yellow_ig),
        n(payload.yellow_mt),
        payload.attachment_url ?? null,
      ]
    );
    return r.rows[0].id as string;
  }
  if (targetType === "cargo_receiving") {
    const r = await query(
      `INSERT INTO cargo_receiving
        (ship_id, ship_name_other, date, "from", location, remark,
         white_ig, white_mt, white_price_aed,
         yellow_ig, yellow_mt, yellow_price_aed, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        counterpartShipId,
        payload.ship_name_other ?? null,
        payload.date ?? null,
        payload.from ?? null,
        payload.location ?? null,
        payload.remark ?? null,
        n(payload.white_ig),
        n(payload.white_mt),
        n(payload.white_price_aed),
        n(payload.yellow_ig),
        n(payload.yellow_mt),
        n(payload.yellow_price_aed),
        payload.attachment_url ?? null,
      ]
    );
    return r.rows[0].id as string;
  }
  if (targetType === "cash_discharge") {
    const r = await query(
      `INSERT INTO cash_discharge
        (ship_id, date, to_ship, location, remark, amount_aed, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        counterpartShipId,
        payload.date ?? null,
        payload.to_ship ?? null,
        payload.location ?? null,
        payload.remark ?? null,
        n(payload.amount_aed),
        payload.attachment_url ?? null,
      ]
    );
    return r.rows[0].id as string;
  }
  const r = await query(
    `INSERT INTO cash_receiving
      (ship_id, date, from_ship, location, remark, amount_aed, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      counterpartShipId,
      payload.date ?? null,
      payload.from_ship ?? null,
      payload.location ?? null,
      payload.remark ?? null,
      n(payload.amount_aed),
      payload.attachment_url ?? null,
    ]
  );
  return r.rows[0].id as string;
}

function payloadMatchesExistingRow(
  targetType: MirrorTargetType,
  row: Record<string, unknown>,
  payload: Record<string, unknown>
): boolean {
  if (
    targetType === "internal_discharge" ||
    targetType === "cargo_receiving"
  ) {
    return (
      datesMatch(row.date, payload.date) &&
      numsMatch(row.white_ig, payload.white_ig) &&
      numsMatch(row.white_mt, payload.white_mt) &&
      numsMatch(row.yellow_ig, payload.yellow_ig) &&
      numsMatch(row.yellow_mt, payload.yellow_mt)
    );
  }
  return datesMatch(row.date, payload.date) && numsMatch(row.amount_aed, payload.amount_aed);
}

export async function approveMirrorProposal(params: {
  proposalId: string;
  actorShipId: string;
  role: "ship" | "admin";
  existingTargetId?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const { proposalId, actorShipId, role, existingTargetId } = params;

  const pr = await query(`SELECT * FROM mirror_proposals WHERE id = $1 LIMIT 1`, [proposalId]);
  if (pr.rows.length === 0) return { error: "Proposal not found" };
  const p = pr.rows[0] as Record<string, unknown>;
  if (p.status !== "pending") return { error: "Proposal is not pending" };

  const counterpartId = p.counterpart_ship_id as string;
  const initiatorId = p.initiator_ship_id as string;
  const sourceType = p.source_type as MirrorSourceType;
  const sourceId = p.source_id as string;
  const targetType = p.target_type as MirrorTargetType;
  const payload = typeof p.payload === "string" ? JSON.parse(p.payload) : (p.payload as Record<string, unknown>);

  if (role !== "admin" && actorShipId !== counterpartId) {
    return { error: "Only the counterpart ship or admin can approve" };
  }

  const confirmedBy = role === "admin" ? "admin" : "counterparty";
  let targetId: string;

  if (existingTargetId) {
    const tbl =
      targetType === "internal_discharge"
        ? "internal_discharge"
        : targetType === "cargo_receiving"
          ? "cargo_receiving"
          : targetType === "cash_discharge"
            ? "cash_discharge"
            : "cash_receiving";
    const rowQ = await query(`SELECT * FROM ${tbl} WHERE id = $1 AND ship_id = $2 LIMIT 1`, [
      existingTargetId,
      counterpartId,
    ]);
    if (rowQ.rows.length === 0) {
      return { error: "Existing row not found on your ledger" };
    }
    if (!payloadMatchesExistingRow(targetType, rowQ.rows[0] as Record<string, unknown>, payload)) {
      return { error: "Existing row does not match proposal (date or amounts)" };
    }
    targetId = existingTargetId;
  } else {
    targetId = await insertTargetRow(targetType, counterpartId, payload);
  }

  await query(
    `INSERT INTO mirrors (source_type, source_id, target_type, target_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_type, source_id) DO UPDATE SET
       target_type = EXCLUDED.target_type,
       target_id = EXCLUDED.target_id`,
    [sourceType, sourceId, targetType, targetId]
  );

  await query(
    `UPDATE mirror_proposals SET
       status = 'approved',
       confirmed_by = $2,
       confirmed_at = now(),
       target_id = $3,
       updated_at = now()
     WHERE id = $1`,
    [proposalId, confirmedBy, targetId]
  );

  const counterpartName = await getShipNameById(counterpartId);
  await notifyShips(
    [initiatorId],
    proposalId,
    "transfer_approved",
    `${counterpartName} approved your transfer`,
    `Your ${sourceType.replace(/_/g, " ")} was confirmed and posted on ${counterpartName}'s ledger.`
  );

  return { ok: true };
}

export async function rejectMirrorProposal(params: {
  proposalId: string;
  actorShipId: string;
  role: "ship" | "admin";
}): Promise<{ ok: true } | { error: string }> {
  const { proposalId, actorShipId, role } = params;

  const pr = await query(`SELECT * FROM mirror_proposals WHERE id = $1 LIMIT 1`, [proposalId]);
  if (pr.rows.length === 0) return { error: "Proposal not found" };
  const p = pr.rows[0] as Record<string, unknown>;
  if (p.status !== "pending") return { error: "Proposal is not pending" };

  const counterpartId = p.counterpart_ship_id as string;
  const initiatorId = p.initiator_ship_id as string;
  const sourceType = p.source_type as string;

  if (role !== "admin" && actorShipId !== counterpartId) {
    return { error: "Only the counterpart ship or admin can reject" };
  }

  await query(
    `UPDATE mirror_proposals SET
       status = 'rejected',
       confirmed_by = $2,
       confirmed_at = now(),
       updated_at = now()
     WHERE id = $1`,
    [proposalId, role === "admin" ? "admin" : "counterparty"]
  );

  const counterpartName = await getShipNameById(counterpartId);
  await notifyShips(
    [initiatorId],
    proposalId,
    "transfer_rejected",
    `${counterpartName} rejected a transfer`,
    `Your ${sourceType.replace(/_/g, " ")} was not confirmed by ${counterpartName}.`
  );

  return { ok: true };
}

/** After source row UPDATE: refresh pending payload, or replace pending if counterpart changed, or sync approved mirror. */
export async function syncCargoReceivingAfterPut(row: Record<string, unknown>): Promise<void> {
  const id = row.id as string;
  const shipId = row.ship_id as string;
  const fromName = String(row.from ?? "").trim();
  const targetShipId = await findShipIdByNameOrLogin(fromName);
  const receivingShipName = await getShipNameById(shipId);

  const pend = await query(
    `SELECT * FROM mirror_proposals WHERE source_type = 'cargo_receiving' AND source_id = $1 AND status = 'pending' LIMIT 1`,
    [id]
  );

  const mir = await query(
    `SELECT target_id FROM mirrors WHERE source_type = 'cargo_receiving' AND source_id = $1 AND target_type = 'internal_discharge' LIMIT 1`,
    [id]
  );
  const existingMirrorTarget = mir.rows[0]?.target_id as string | undefined;

  if (pend.rows.length > 0) {
    const pr = pend.rows[0] as Record<string, unknown>;
    if (!targetShipId) {
      await supersedePendingForSource("cargo_receiving", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM internal_discharge WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cargo_receiving' AND source_id = $1`, [id]);
      }
      return;
    }
    if (pr.counterpart_ship_id !== targetShipId) {
      await supersedePendingForSource("cargo_receiving", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM internal_discharge WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cargo_receiving' AND source_id = $1`, [id]);
      }
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: targetShipId,
        sourceType: "cargo_receiving",
        sourceId: id,
        targetType: "internal_discharge",
        payload: buildInternalDischargePayloadFromCargoForm({
          date: row.date as string | null,
          location: row.location as string | null,
          remark: row.remark as string | null,
          white_ig: n(row.white_ig) ?? undefined,
          white_mt: n(row.white_mt) ?? undefined,
          yellow_ig: n(row.yellow_ig) ?? undefined,
          yellow_mt: n(row.yellow_mt) ?? undefined,
          attachment_url: row.attachment_url as string | null,
          receivingShipName,
        }),
      });
      return;
    }
    await query(
      `UPDATE mirror_proposals SET payload = $2::jsonb, updated_at = now()
       WHERE id = $1`,
      [
        pr.id,
        JSON.stringify(
          buildInternalDischargePayloadFromCargoForm({
            date: row.date as string | null,
            location: row.location as string | null,
            remark: row.remark as string | null,
            white_ig: n(row.white_ig) ?? undefined,
            white_mt: n(row.white_mt) ?? undefined,
            yellow_ig: n(row.yellow_ig) ?? undefined,
            yellow_mt: n(row.yellow_mt) ?? undefined,
            attachment_url: row.attachment_url as string | null,
            receivingShipName,
          })
        ),
      ]
    );
    return;
  }

  if (existingMirrorTarget && targetShipId) {
    await query(
      `UPDATE internal_discharge SET
        date = $2,
        "to" = $3,
        location = $4,
        remark = $5,
        white_ig = $6,
        white_mt = $7,
        yellow_ig = $8,
        yellow_mt = $9,
        attachment_url = $10,
        updated_at = now()
       WHERE id = $1`,
      [
        existingMirrorTarget,
        row.date ?? null,
        receivingShipName || null,
        row.location ?? null,
        row.remark ?? null,
        n(row.white_ig),
        n(row.white_mt),
        n(row.yellow_ig),
        n(row.yellow_mt),
        row.attachment_url ?? null,
      ]
    );
    await query(`UPDATE mirror_proposals SET target_id = $2, updated_at = now()
                  WHERE source_type = 'cargo_receiving' AND source_id = $1 AND status = 'approved'`, [
      id,
      existingMirrorTarget,
    ]);
    return;
  }

  if (existingMirrorTarget && !targetShipId) {
    await query(`DELETE FROM internal_discharge WHERE id = $1`, [existingMirrorTarget]);
    await query(`DELETE FROM mirrors WHERE source_type = 'cargo_receiving' AND source_id = $1`, [id]);
    return;
  }

  if (!existingMirrorTarget && targetShipId) {
    await createPendingProposal({
      initiatorShipId: shipId,
      counterpartShipId: targetShipId,
      sourceType: "cargo_receiving",
      sourceId: id,
      targetType: "internal_discharge",
      payload: buildInternalDischargePayloadFromCargoForm({
        date: row.date as string | null,
        location: row.location as string | null,
        remark: row.remark as string | null,
        white_ig: n(row.white_ig) ?? undefined,
        white_mt: n(row.white_mt) ?? undefined,
        yellow_ig: n(row.yellow_ig) ?? undefined,
        yellow_mt: n(row.yellow_mt) ?? undefined,
        attachment_url: row.attachment_url as string | null,
        receivingShipName,
      }),
    });
  }
}

export async function syncInternalDischargeAfterPut(row: Record<string, unknown>): Promise<void> {
  const id = row.id as string;
  const shipId = row.ship_id as string;
  const toName = String(row.to ?? "").trim();
  const targetShipId = await findShipIdByNameOrLogin(toName);
  const sellerShipName = await getShipNameById(shipId);

  const pend = await query(
    `SELECT * FROM mirror_proposals WHERE source_type = 'internal_discharge' AND source_id = $1 AND status = 'pending' LIMIT 1`,
    [id]
  );
  const mir = await query(
    `SELECT target_id FROM mirrors WHERE source_type = 'internal_discharge' AND source_id = $1 AND target_type = 'cargo_receiving' LIMIT 1`,
    [id]
  );
  const existingMirrorTarget = mir.rows[0]?.target_id as string | undefined;

  if (pend.rows.length > 0) {
    const pr = pend.rows[0] as Record<string, unknown>;
    if (!targetShipId) {
      await supersedePendingForSource("internal_discharge", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cargo_receiving WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'internal_discharge' AND source_id = $1`, [id]);
      }
      return;
    }
    if (pr.counterpart_ship_id !== targetShipId) {
      await supersedePendingForSource("internal_discharge", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cargo_receiving WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'internal_discharge' AND source_id = $1`, [id]);
      }
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: targetShipId,
        sourceType: "internal_discharge",
        sourceId: id,
        targetType: "cargo_receiving",
        payload: buildCargoReceivingPayloadFromDischargeForm({
          date: row.date as string | null,
          location: row.location as string | null,
          remark: row.remark as string | null,
          white_ig: n(row.white_ig) ?? undefined,
          white_mt: n(row.white_mt) ?? undefined,
          yellow_ig: n(row.yellow_ig) ?? undefined,
          yellow_mt: n(row.yellow_mt) ?? undefined,
          attachment_url: row.attachment_url as string | null,
          fromShipName: sellerShipName,
        }),
      });
      return;
    }
    await query(
      `UPDATE mirror_proposals SET payload = $2::jsonb, updated_at = now() WHERE id = $1`,
      [
        pr.id,
        JSON.stringify(
          buildCargoReceivingPayloadFromDischargeForm({
            date: row.date as string | null,
            location: row.location as string | null,
            remark: row.remark as string | null,
            white_ig: n(row.white_ig) ?? undefined,
            white_mt: n(row.white_mt) ?? undefined,
            yellow_ig: n(row.yellow_ig) ?? undefined,
            yellow_mt: n(row.yellow_mt) ?? undefined,
            attachment_url: row.attachment_url as string | null,
            fromShipName: sellerShipName,
          })
        ),
      ]
    );
    return;
  }

  if (existingMirrorTarget && targetShipId) {
    await query(
      `UPDATE cargo_receiving SET
        date = $2,
        "from" = $3,
        location = $4,
        remark = $5,
        white_ig = $6,
        white_mt = $7,
        white_price_aed = $8,
        yellow_ig = $9,
        yellow_mt = $10,
        yellow_price_aed = $11,
        attachment_url = $12,
        updated_at = now()
       WHERE id = $1`,
      [
        existingMirrorTarget,
        row.date ?? null,
        sellerShipName || null,
        row.location ?? null,
        row.remark ?? null,
        n(row.white_ig),
        n(row.white_mt),
        null,
        n(row.yellow_ig),
        n(row.yellow_mt),
        null,
        row.attachment_url ?? null,
      ]
    );
    await query(`UPDATE mirror_proposals SET target_id = $2, updated_at = now()
                  WHERE source_type = 'internal_discharge' AND source_id = $1 AND status = 'approved'`, [
      id,
      existingMirrorTarget,
    ]);
    return;
  }

  if (existingMirrorTarget && !targetShipId) {
    await query(`DELETE FROM cargo_receiving WHERE id = $1`, [existingMirrorTarget]);
    await query(`DELETE FROM mirrors WHERE source_type = 'internal_discharge' AND source_id = $1`, [id]);
    return;
  }

  if (!existingMirrorTarget && targetShipId) {
    await createPendingProposal({
      initiatorShipId: shipId,
      counterpartShipId: targetShipId,
      sourceType: "internal_discharge",
      sourceId: id,
      targetType: "cargo_receiving",
      payload: buildCargoReceivingPayloadFromDischargeForm({
        date: row.date as string | null,
        location: row.location as string | null,
        remark: row.remark as string | null,
        white_ig: n(row.white_ig) ?? undefined,
        white_mt: n(row.white_mt) ?? undefined,
        yellow_ig: n(row.yellow_ig) ?? undefined,
        yellow_mt: n(row.yellow_mt) ?? undefined,
        attachment_url: row.attachment_url as string | null,
        fromShipName: sellerShipName,
      }),
    });
  }
}

export async function syncCashReceivingAfterPut(row: Record<string, unknown>): Promise<void> {
  const id = row.id as string;
  const shipId = row.ship_id as string;
  const fromName = String(row.from_ship ?? "").trim();
  const targetShipId = await findShipIdByNameOrLogin(fromName);
  const receivingShipName = await getShipNameById(shipId);

  const pend = await query(
    `SELECT * FROM mirror_proposals WHERE source_type = 'cash_receiving' AND source_id = $1 AND status = 'pending' LIMIT 1`,
    [id]
  );
  const mir = await query(
    `SELECT target_id FROM mirrors WHERE source_type = 'cash_receiving' AND source_id = $1 AND target_type = 'cash_discharge' LIMIT 1`,
    [id]
  );
  const existingMirrorTarget = mir.rows[0]?.target_id as string | undefined;

  if (pend.rows.length > 0) {
    const pr = pend.rows[0] as Record<string, unknown>;
    if (!targetShipId) {
      await supersedePendingForSource("cash_receiving", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cash_discharge WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cash_receiving' AND source_id = $1`, [id]);
      }
      return;
    }
    if (pr.counterpart_ship_id !== targetShipId) {
      await supersedePendingForSource("cash_receiving", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cash_discharge WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cash_receiving' AND source_id = $1`, [id]);
      }
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: targetShipId,
        sourceType: "cash_receiving",
        sourceId: id,
        targetType: "cash_discharge",
        payload: buildCashDischargePayloadFromReceivingForm({
          date: row.date as string | null,
          location: row.location as string | null,
          remark: row.remark as string | null,
          amount_aed: n(row.amount_aed) ?? undefined,
          attachment_url: row.attachment_url as string | null,
          receivingShipName,
        }),
      });
      return;
    }
    await query(
      `UPDATE mirror_proposals SET payload = $2::jsonb, updated_at = now() WHERE id = $1`,
      [
        pr.id,
        JSON.stringify(
          buildCashDischargePayloadFromReceivingForm({
            date: row.date as string | null,
            location: row.location as string | null,
            remark: row.remark as string | null,
            amount_aed: n(row.amount_aed) ?? undefined,
            attachment_url: row.attachment_url as string | null,
            receivingShipName,
          })
        ),
      ]
    );
    return;
  }

  if (existingMirrorTarget && targetShipId) {
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
        existingMirrorTarget,
        row.date ?? null,
        receivingShipName || null,
        row.location ?? null,
        row.remark ?? null,
        n(row.amount_aed),
        row.attachment_url ?? null,
      ]
    );
    await query(`UPDATE mirror_proposals SET target_id = $2, updated_at = now()
                  WHERE source_type = 'cash_receiving' AND source_id = $1 AND status = 'approved'`, [
      id,
      existingMirrorTarget,
    ]);
    return;
  }

  if (existingMirrorTarget && !targetShipId) {
    await query(`DELETE FROM cash_discharge WHERE id = $1`, [existingMirrorTarget]);
    await query(`DELETE FROM mirrors WHERE source_type = 'cash_receiving' AND source_id = $1`, [id]);
    return;
  }

  if (!existingMirrorTarget && targetShipId) {
    await createPendingProposal({
      initiatorShipId: shipId,
      counterpartShipId: targetShipId,
      sourceType: "cash_receiving",
      sourceId: id,
      targetType: "cash_discharge",
      payload: buildCashDischargePayloadFromReceivingForm({
        date: row.date as string | null,
        location: row.location as string | null,
        remark: row.remark as string | null,
        amount_aed: n(row.amount_aed) ?? undefined,
        attachment_url: row.attachment_url as string | null,
        receivingShipName,
      }),
    });
  }
}

export async function syncCashDischargeAfterPut(row: Record<string, unknown>): Promise<void> {
  const id = row.id as string;
  const shipId = row.ship_id as string;
  const toName = String(row.to_ship ?? "").trim();
  const targetShipId = await findShipIdByNameOrLogin(toName);
  const sellerShipName = await getShipNameById(shipId);

  const pend = await query(
    `SELECT * FROM mirror_proposals WHERE source_type = 'cash_discharge' AND source_id = $1 AND status = 'pending' LIMIT 1`,
    [id]
  );
  const mir = await query(
    `SELECT target_id FROM mirrors WHERE source_type = 'cash_discharge' AND source_id = $1 AND target_type = 'cash_receiving' LIMIT 1`,
    [id]
  );
  const existingMirrorTarget = mir.rows[0]?.target_id as string | undefined;

  if (pend.rows.length > 0) {
    const pr = pend.rows[0] as Record<string, unknown>;
    if (!targetShipId) {
      await supersedePendingForSource("cash_discharge", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cash_receiving WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cash_discharge' AND source_id = $1`, [id]);
      }
      return;
    }
    if (pr.counterpart_ship_id !== targetShipId) {
      await supersedePendingForSource("cash_discharge", id);
      if (existingMirrorTarget) {
        await query(`DELETE FROM cash_receiving WHERE id = $1`, [existingMirrorTarget]);
        await query(`DELETE FROM mirrors WHERE source_type = 'cash_discharge' AND source_id = $1`, [id]);
      }
      await createPendingProposal({
        initiatorShipId: shipId,
        counterpartShipId: targetShipId,
        sourceType: "cash_discharge",
        sourceId: id,
        targetType: "cash_receiving",
        payload: buildCashReceivingPayloadFromDischargeForm({
          date: row.date as string | null,
          location: row.location as string | null,
          remark: row.remark as string | null,
          amount_aed: n(row.amount_aed) ?? undefined,
          attachment_url: row.attachment_url as string | null,
          fromShipName: sellerShipName,
        }),
      });
      return;
    }
    await query(
      `UPDATE mirror_proposals SET payload = $2::jsonb, updated_at = now() WHERE id = $1`,
      [
        pr.id,
        JSON.stringify(
          buildCashReceivingPayloadFromDischargeForm({
            date: row.date as string | null,
            location: row.location as string | null,
            remark: row.remark as string | null,
            amount_aed: n(row.amount_aed) ?? undefined,
            attachment_url: row.attachment_url as string | null,
            fromShipName: sellerShipName,
          })
        ),
      ]
    );
    return;
  }

  if (existingMirrorTarget && targetShipId) {
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
        existingMirrorTarget,
        row.date ?? null,
        sellerShipName || null,
        row.location ?? null,
        row.remark ?? null,
        n(row.amount_aed),
        row.attachment_url ?? null,
      ]
    );
    await query(`UPDATE mirror_proposals SET target_id = $2, updated_at = now()
                  WHERE source_type = 'cash_discharge' AND source_id = $1 AND status = 'approved'`, [
      id,
      existingMirrorTarget,
    ]);
    return;
  }

  if (existingMirrorTarget && !targetShipId) {
    await query(`DELETE FROM cash_receiving WHERE id = $1`, [existingMirrorTarget]);
    await query(`DELETE FROM mirrors WHERE source_type = 'cash_discharge' AND source_id = $1`, [id]);
    return;
  }

  if (!existingMirrorTarget && targetShipId) {
    await createPendingProposal({
      initiatorShipId: shipId,
      counterpartShipId: targetShipId,
      sourceType: "cash_discharge",
      sourceId: id,
      targetType: "cash_receiving",
      payload: buildCashReceivingPayloadFromDischargeForm({
        date: row.date as string | null,
        location: row.location as string | null,
        remark: row.remark as string | null,
        amount_aed: n(row.amount_aed) ?? undefined,
        attachment_url: row.attachment_url as string | null,
        fromShipName: sellerShipName,
      }),
    });
  }
}

export async function findMatchingPendingProposalForManualInternalDischarge(params: {
  postingShipId: string;
  initiatorShipId: string;
  date: string | null;
  white_ig: number | null;
  white_mt: number | null;
  yellow_ig: number | null;
  yellow_mt: number | null;
}): Promise<string | null> {
  const r = await query(
    `SELECT id, payload FROM mirror_proposals
     WHERE status = 'pending'
       AND target_type = 'internal_discharge'
       AND counterpart_ship_id = $1
       AND initiator_ship_id = $2`,
    [params.postingShipId, params.initiatorShipId]
  );
  for (const row of r.rows) {
    const pl = row.payload as Record<string, unknown>;
    if (
      datesMatch(params.date, pl.date) &&
      numsMatch(params.white_ig, pl.white_ig) &&
      numsMatch(params.white_mt, pl.white_mt) &&
      numsMatch(params.yellow_ig, pl.yellow_ig) &&
      numsMatch(params.yellow_mt, pl.yellow_mt)
    ) {
      return row.id as string;
    }
  }
  return null;
}

export async function findMatchingPendingProposalForManualCargoReceiving(params: {
  postingShipId: string;
  initiatorShipId: string;
  date: string | null;
  white_ig: number | null;
  white_mt: number | null;
  yellow_ig: number | null;
  yellow_mt: number | null;
}): Promise<string | null> {
  const r = await query(
    `SELECT id, payload FROM mirror_proposals
     WHERE status = 'pending'
       AND target_type = 'cargo_receiving'
       AND counterpart_ship_id = $1
       AND initiator_ship_id = $2`,
    [params.postingShipId, params.initiatorShipId]
  );
  for (const row of r.rows) {
    const pl = row.payload as Record<string, unknown>;
    if (
      datesMatch(params.date, pl.date) &&
      numsMatch(params.white_ig, pl.white_ig) &&
      numsMatch(params.white_mt, pl.white_mt) &&
      numsMatch(params.yellow_ig, pl.yellow_ig) &&
      numsMatch(params.yellow_mt, pl.yellow_mt)
    ) {
      return row.id as string;
    }
  }
  return null;
}

export async function findMatchingPendingProposalForManualCashReceiving(params: {
  postingShipId: string;
  initiatorShipId: string;
  date: string | null;
  amount_aed: number | null;
}): Promise<string | null> {
  const r = await query(
    `SELECT id, payload FROM mirror_proposals
     WHERE status = 'pending'
       AND target_type = 'cash_receiving'
       AND counterpart_ship_id = $1
       AND initiator_ship_id = $2`,
    [params.postingShipId, params.initiatorShipId]
  );
  for (const row of r.rows) {
    const pl = row.payload as Record<string, unknown>;
    if (datesMatch(params.date, pl.date) && numsMatch(params.amount_aed, pl.amount_aed)) {
      return row.id as string;
    }
  }
  return null;
}

export async function findMatchingPendingProposalForManualCashDischarge(params: {
  postingShipId: string;
  initiatorShipId: string;
  date: string | null;
  amount_aed: number | null;
}): Promise<string | null> {
  const r = await query(
    `SELECT id, payload FROM mirror_proposals
     WHERE status = 'pending'
       AND target_type = 'cash_discharge'
       AND counterpart_ship_id = $1
       AND initiator_ship_id = $2`,
    [params.postingShipId, params.initiatorShipId]
  );
  for (const row of r.rows) {
    const pl = row.payload as Record<string, unknown>;
    if (datesMatch(params.date, pl.date) && numsMatch(params.amount_aed, pl.amount_aed)) {
      return row.id as string;
    }
  }
  return null;
}
