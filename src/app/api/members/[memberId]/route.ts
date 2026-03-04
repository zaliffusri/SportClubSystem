import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUser, createAuditLog, getUserById } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const isAdmin = session.role === "admin";
  const isSelf = session.id === memberId;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "You can only edit your own profile" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; email?: string; branchId?: string | null; status?: "active" | "inactive"; role?: "admin" | "member" } = {};

  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.email === "string") updates.email = body.email;
  if (isAdmin) {
    if (typeof body.branchId === "string") updates.branchId = body.branchId.trim() || null;
    if (body.status === "active" || body.status === "inactive") updates.status = body.status;
    if (body.role === "admin" || body.role === "member") updates.role = body.role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const target = await getUserById(memberId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!isAdmin && target.role !== "member") return NextResponse.json({ error: "Member not found" }, { status: 404 });

  try {
    const member = await updateUser(memberId, updates);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    await createAuditLog(
      "member_updated",
      "member",
      memberId,
      session.id,
      session.role,
      session.email,
      updates
    );
    return NextResponse.json(member);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
