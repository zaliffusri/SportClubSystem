import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  const leaderboard = await getLeaderboard(branchId);
  return NextResponse.json(leaderboard);
}
