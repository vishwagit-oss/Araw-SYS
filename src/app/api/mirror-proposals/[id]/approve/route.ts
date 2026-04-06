import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveMirrorProposal } from "@/lib/mirror-proposals";

export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: proposalId } = context.params;
  let body: { existing_target_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body
  }

  const existingTargetId =
    typeof body.existing_target_id === "string" ? body.existing_target_id.trim() || undefined : undefined;

  const result = await approveMirrorProposal({
    proposalId,
    actorShipId: session.ship.id,
    role: session.ship.role,
    existingTargetId: existingTargetId ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
