import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAdminByEmail,
  getMemberById,
  updateAdminPassword,
  updateMemberPassword,
} from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { currentPassword, newPassword } = await request.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password required" },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }
  if (session.role === "admin") {
    const admin = await getAdminByEmail(session.email);
    if (!admin?.passwordHash) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    const newHash = await hashPassword(newPassword);
    await updateAdminPassword(session.id, newHash);
    return NextResponse.json({ ok: true, message: "Password updated" });
  }
  const member = await getMemberById(session.id);
  if (!member?.passwordHash) {
    return NextResponse.json({ error: "Member not found or has no account" }, { status: 404 });
  }
  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  const newHash = await hashPassword(newPassword);
  await updateMemberPassword(session.id, newHash);
  return NextResponse.json({ ok: true, message: "Password updated" });
}
