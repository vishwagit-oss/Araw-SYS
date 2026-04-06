import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rejectMirrorProposal } from "@/lib/mirror-proposals";

export async function POST(_request: Request, context: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: proposalId } = context.params;

  const result = await rejectMirrorProposal({
    proposalId,
    actorShipId: session.ship.id,
    role: session.ship.role,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
