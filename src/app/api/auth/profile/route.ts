import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById, getBranches } from "@/lib/db";

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
