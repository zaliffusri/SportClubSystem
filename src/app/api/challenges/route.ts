import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChallenges, createChallenge, getGame, getMemberById, getMemberTotalPoints } from "@/lib/db";
import { createAuditLog } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // 'all' | 'for_me' (notifications: where I'm opponent & pending) | 'mine'
  const challenges = await getChallenges();
  const withNames = await Promise.all(
    challenges.map(async (c) => {
      const [challenger, opponent, game] = await Promise.all([
        getMemberById(c.challengerMemberId),
        getMemberById(c.opponentMemberId),
        getGame(c.gameId),
      ]);
      return {
        ...c,
        challengerName: challenger?.name ?? c.challengerMemberId,
        opponentName: opponent?.name ?? c.opponentMemberId,
        gameName: game?.name ?? c.gameId,
      };
    })
  );
  if (session.role === "admin") {
    if (filter === "notifications") return NextResponse.json([]);
    return NextResponse.json(withNames);
  }
  const memberId = session.id;
  if (filter === "notifications") {
    const list = withNames.filter(
      (c) => c.opponentMemberId === memberId && c.status === "pending"
    );
    return NextResponse.json(list);
  }
  if (filter === "mine") {
    const list = withNames.filter(
      (c) => c.challengerMemberId === memberId || c.opponentMemberId === memberId
    );
    return NextResponse.json(list);
  }
  return NextResponse.json(withNames);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Members only" }, { status: 403 });
  }
  const { gameId, opponentMemberId, pointsWagered } = await request.json();
  if (!gameId || !opponentMemberId || pointsWagered == null) {
    return NextResponse.json(
      { error: "gameId, opponentMemberId, and pointsWagered required" },
      { status: 400 }
    );
  }
  const points = Number(pointsWagered);
  if (Number.isNaN(points) || points < 1) {
    return NextResponse.json({ error: "pointsWagered must be at least 1" }, { status: 400 });
  }
  const challengerPoints = await getMemberTotalPoints(session.id);
  if (points > challengerPoints) {
    return NextResponse.json(
      { error: `You don't have enough points. Your total: ${challengerPoints}, wagered: ${points}` },
      { status: 400 }
    );
  }
  try {
    const challenge = await createChallenge(
      gameId,
      session.id,
      opponentMemberId,
      points
    );
    await createAuditLog(
      "challenge_created",
      "challenge",
      challenge.id,
      session.id,
      "member",
      session.email,
      { gameId, opponentMemberId, pointsWagered: points }
    );
    const game = await getGame(challenge.gameId);
    const opponent = await getMemberById(challenge.opponentMemberId);
    return NextResponse.json({
      ...challenge,
      gameName: game?.name,
      opponentName: opponent?.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
