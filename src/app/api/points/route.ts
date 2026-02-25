import { NextResponse } from "next/server";
import { getPointEntries, addPointEntry, createAuditLog } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId") ?? undefined;
  const entries = await getPointEntries(gameId);
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const { gameId, memberId, points } = await request.json();
  if (!gameId) return NextResponse.json({ error: "Game required" }, { status: 400 });
  if (!memberId) return NextResponse.json({ error: "Member required" }, { status: 400 });
  const num = Number(points);
  if (Number.isNaN(num) || num < 0) return NextResponse.json({ error: "Valid points required" }, { status: 400 });
  const entry = await addPointEntry(gameId, memberId, num);
  const session = await getSession();
  if (session) {
    await createAuditLog(
      "point_entry_added",
      "point_entry",
      entry.id,
      session.id,
      session.role,
      session.email,
      { gameId, memberId, points: num }
    );
  }
  return NextResponse.json(entry);
}
