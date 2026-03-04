import { NextResponse } from "next/server";
import { getSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { getUserById, getBranches, updateUser } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(session.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const branches = await getBranches();
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  return NextResponse.json({
    role: user.role,
    id: session.id,
    email: session.email,
    name: user.name ?? (user.role === "admin" ? "Admin" : ""),
    branchId: user.branchId ?? undefined,
    branchName: user.branchId ? branchName(user.branchId) : "",
    status: user.status ?? "active",
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { email: newEmail, currentPassword } = body;
  if (!newEmail || typeof newEmail !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!currentPassword || typeof currentPassword !== "string") {
    return NextResponse.json({ error: "Current password required to change email" }, { status: 400 });
  }
  const user = await getUserById(session.id);
  if (!user?.passwordHash) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  try {
    const updated = await updateUser(session.id, { email: trimmed });
    if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 400 });
    await setSessionCookie({ role: session.role, id: session.id, email: updated.email });
    return NextResponse.json({ ok: true, email: updated.email, message: "Email updated." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
