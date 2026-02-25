import { NextResponse } from "next/server";
import { getMembers, addMember, createAuditLog } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") ?? undefined;
  const members = await getMembers(branchId);
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { name, branchId, email } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!branchId) return NextResponse.json({ error: "Branch required" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email required (for login)" }, { status: 400 });
  try {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    const member = await addMember(name.trim(), branchId, email.trim(), passwordHash);
    await createAuditLog(
      "member_added",
      "member",
      member.id,
      session.id,
      "admin",
      session.email,
      { name: member.name, branchId, email: member.email }
    );
    return NextResponse.json(member);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
