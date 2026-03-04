import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGame, hasUserJoinedGame, addPointEntry } from "@/lib/db";

const JOIN_POINTS = 1;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to join this game" }, { status: 401 });

  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const alreadyJoined = await hasUserJoinedGame(gameId, session.id);
  if (alreadyJoined) {
    return NextResponse.json({ alreadyJoined: true, message: "You have already joined this game." });
  }

  await addPointEntry(gameId, session.id, JOIN_POINTS);
  return NextResponse.json({
    joined: true,
    points: JOIN_POINTS,
    message: `You joined "${game.name}" and earned ${JOIN_POINTS} point.`,
  });
}
