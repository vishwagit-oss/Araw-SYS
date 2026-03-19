import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.ship.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remaining stock = received - discharged (per ship).
  const r = await query(
    `
    WITH cargo_recv AS (
      SELECT
        ship_id,
        SUM(white_ig)  AS white_ig,
        SUM(white_mt)  AS white_mt,
        SUM(yellow_ig) AS yellow_ig,
        SUM(yellow_mt) AS yellow_mt
      FROM cargo_receiving
      GROUP BY ship_id
    ),
    cargo_dis AS (
      SELECT
        ship_id,
        SUM(white_ig)  AS white_ig,
        SUM(white_mt)  AS white_mt,
        SUM(yellow_ig) AS yellow_ig,
        SUM(yellow_mt) AS yellow_mt
      FROM internal_discharge
      GROUP BY ship_id
    ),
    cash_recv AS (
      SELECT ship_id, SUM(amount_aed) AS cash_amount
      FROM cash_receiving
      GROUP BY ship_id
    ),
    cash_dis AS (
      SELECT ship_id, SUM(amount_aed) AS cash_amount
      FROM cash_discharge
      GROUP BY ship_id
    )
    SELECT
      s.id AS ship_id,
      s.name AS ship_name,
      COALESCE(cr.white_ig, 0)  - COALESCE(cd.white_ig, 0)  AS white_ig_remaining,
      COALESCE(cr.white_mt, 0)  - COALESCE(cd.white_mt, 0)  AS white_mt_remaining,
      COALESCE(cr.yellow_ig, 0) - COALESCE(cd.yellow_ig, 0) AS yellow_ig_remaining,
      COALESCE(cr.yellow_mt, 0) - COALESCE(cd.yellow_mt, 0) AS yellow_mt_remaining,
      COALESCE(crr.cash_amount, 0) - COALESCE(cdd.cash_amount, 0) AS cash_amount_remaining
    FROM ships s
    LEFT JOIN cargo_recv cr ON cr.ship_id = s.id
    LEFT JOIN cargo_dis cd ON cd.ship_id = s.id
    LEFT JOIN cash_recv crr ON crr.ship_id = s.id
    LEFT JOIN cash_dis cdd ON cdd.ship_id = s.id
    WHERE s.role = 'ship'
    ORDER BY s.name
    `
  );

  return NextResponse.json({ summary: r.rows });
}

