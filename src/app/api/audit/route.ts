import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);
  const logs = await getAuditLogs(limit);
  if (session.role === "member") {
    const filtered = logs.filter((l) => l.userId === session.id);
    return NextResponse.json(filtered);
  }
  return NextResponse.json(logs);
}
