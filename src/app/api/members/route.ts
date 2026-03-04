import { NextResponse } from "next/server";
import { getUsers, addUser, createAuditLog } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") ?? undefined;

  if (session?.role === "member") {
    const allMembers = await getUsers("member");
    const self = allMembers.find((m) => m.id === session.id);
    return NextResponse.json(self ? [self] : []);
  }

  const members = await getUsers("member", branchId);
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
    const user = await addUser(email.trim(), passwordHash, name.trim(), "member", branchId);
    await createAuditLog(
      "member_added",
      "member",
      user.id,
      session.id,
      "admin",
      session.email,
      { name: user.name, branchId, email: user.email }
    );
    return NextResponse.json({ id: user.id, name: user.name, branchId: user.branchId, email: user.email, status: user.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
