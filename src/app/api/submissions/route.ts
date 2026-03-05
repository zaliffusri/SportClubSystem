import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSubmissions, addSubmission, getGame, getUserById } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });
  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  const submissions = await getSubmissions(gameId);
  return NextResponse.json(submissions);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to submit" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { gameId, memberId: bodyMemberId, answer } = body;
  if (!gameId) return NextResponse.json({ error: "Game required" }, { status: 400 });

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.type !== "guessing") return NextResponse.json({ error: "Not a guessing game" }, { status: 400 });

  let memberId: string;
  if (session.role === "admin" || session.role === "finance") {
    if (!bodyMemberId) return NextResponse.json({ error: "Member required" }, { status: 400 });
    const member = await getUserById(bodyMemberId);
    if (!member || member.role !== "member") return NextResponse.json({ error: "Member not found" }, { status: 400 });
    memberId = bodyMemberId;
  } else {
    memberId = session.id;
  }

  const sub = await addSubmission(gameId, memberId, (answer ?? "").trim());
  return NextResponse.json(sub);
}
