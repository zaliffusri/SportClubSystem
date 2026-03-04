import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById, updateUserPassword } from "@/lib/db";
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
  const user = await getUserById(session.id);
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "User not found or has no password set" }, { status: 404 });
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  const newHash = await hashPassword(newPassword);
  await updateUserPassword(session.id, newHash);
  return NextResponse.json({ ok: true, message: "Password updated" });
}
