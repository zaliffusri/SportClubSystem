import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminById, getMemberById, getBranches } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branches = await getBranches();
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  if (session.role === "admin") {
    const admin = await getAdminById(session.id);
    return NextResponse.json({
      role: "admin",
      id: session.id,
      email: session.email,
      name: admin?.name ?? "Admin",
    });
  }
  const member = await getMemberById(session.id);
  return NextResponse.json({
    role: "member",
    id: session.id,
    email: session.email,
    name: member?.name ?? "",
    branchId: member?.branchId,
    branchName: member?.branchId ? branchName(member.branchId) : "",
    status: (member as { status?: string })?.status ?? "active",
  });
}
