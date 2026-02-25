import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateMember, createAuditLog } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { memberId } = await params;
  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; email?: string; branchId?: string; status?: "active" | "inactive" } = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.email === "string") updates.email = body.email;
  if (typeof body.branchId === "string") updates.branchId = body.branchId;
  if (body.status === "active" || body.status === "inactive") updates.status = body.status;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  try {
    const member = await updateMember(memberId, updates);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    await createAuditLog(
      "member_updated",
      "member",
      memberId,
      session.id,
      "admin",
      session.email,
      updates
    );
    return NextResponse.json(member);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
