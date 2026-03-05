import { NextResponse } from "next/server";
import { getGames, addGame, createAuditLog } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const games = await getGames();
  return NextResponse.json(games);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return NextResponse.json({ error: "Admin or Finance only" }, { status: 403 });
  }
  const { name, date, description, type } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });
  const gameType =
    type === "guessing" ? "guessing" : type === "challenge" ? "challenge" : "standard";
  const game = await addGame(name.trim(), date, description?.trim(), gameType);
  if (session) {
    await createAuditLog(
      "game_created",
      "game",
      game.id,
      session.id,
      session.role,
      session.email,
      { name: game.name, type: gameType }
    );
  }
  return NextResponse.json(game);
}
