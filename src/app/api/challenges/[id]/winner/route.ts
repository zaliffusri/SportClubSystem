import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChallengeById, declareChallengeWinner, getUserById, getGame } from "@/lib/db";
import { createAuditLog } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return NextResponse.json({ error: "Admin or Finance only" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const winnerMemberId = body.winnerMemberId;
  if (!winnerMemberId) {
    return NextResponse.json({ error: "winnerMemberId required" }, { status: 400 });
  }
  const challenge = await getChallengeById(id);
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.status !== "accepted") {
    return NextResponse.json(
      { error: "Only accepted challenges can have a winner declared" },
      { status: 400 }
    );
  }
  try {
    const updated = await declareChallengeWinner(id, winnerMemberId);
    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 400 });
    await createAuditLog(
      "challenge_winner_declared",
      "challenge",
      id,
      session.id,
      "admin",
      session.email,
      {
        challengeId: id,
        winnerMemberId,
        pointsWagered: challenge.pointsWagered,
        winnerGain: challenge.pointsWagered,
        loserDeduction: -challenge.pointsWagered,
      }
    );
    const winner = await getUserById(winnerMemberId);
    const game = await getGame(challenge.gameId);
    return NextResponse.json({
      ...updated,
      winnerName: winner?.name,
      gameName: game?.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid winner";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
