import { NextResponse } from "next/server";
import { getLeaderboard, getBranches, ensureDb } from "@/lib/db";

export async function GET() {
  await ensureDb();
  const branches = await getBranches();
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  const leaderboard = await getLeaderboard(branchNames);
  return NextResponse.json(leaderboard);
}
