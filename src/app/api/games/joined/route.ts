import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGamesJoinedByUser } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to see your games" }, { status: 401 });

  const games = await getGamesJoinedByUser(session.id);
  return NextResponse.json({ games });
}
