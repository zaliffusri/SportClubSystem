import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsersNeedingAccounts, setUserAccount } from "@/lib/db";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

/** List members that don't have a login account yet. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const needing = await getUsersNeedingAccounts();
  const list = needing.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email ?? "",
  }));
  return NextResponse.json({ count: list.length, members: list });
}

/** Create login accounts for all members that don't have one yet. */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const needing = await getUsersNeedingAccounts();
  if (needing.length === 0) {
    return NextResponse.json({ created: 0, message: "All members already have accounts." });
  }
  const defaultHash = await hashPassword(DEFAULT_PASSWORD);
  const created: { memberId: string; name: string; email: string }[] = [];
  for (const m of needing) {
    const email =
      m.email?.trim() ||
      `member-${m.id.replace(/[^a-z0-9]/gi, "")}@sportclub.local`;
    try {
      await setUserAccount(m.id, email, defaultHash);
      created.push({ memberId: m.id, name: m.name, email });
    } catch (err) {
      console.error("Create account for member", m.id, err);
      // Skip duplicate email etc.
    }
  }
  return NextResponse.json({
    created: created.length,
    message: `Created ${created.length} account(s). Default password: ${DEFAULT_PASSWORD}`,
    accounts: created,
  });
}
