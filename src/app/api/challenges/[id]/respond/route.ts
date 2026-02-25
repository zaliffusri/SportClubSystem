import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChallengeById, respondToChallenge } from "@/lib/db";
import { createAuditLog } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Members only" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action === "accept" || body.action === "reject" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }
  const challenge = await getChallengeById(id);
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.opponentMemberId !== session.id) {
    return NextResponse.json({ error: "Only the challenged member can respond" }, { status: 403 });
  }
  if (challenge.status !== "pending") {
    return NextResponse.json({ error: "Challenge already responded to" }, { status: 400 });
  }
  const updated = await respondToChallenge(id, action);
  if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  await createAuditLog(
    action === "accept" ? "challenge_accepted" : "challenge_rejected",
    "challenge",
    id,
    session.id,
    "member",
    session.email,
    { challengeId: id, action }
  );
  return NextResponse.json(updated);
}
