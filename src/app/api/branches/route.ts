import { NextResponse } from "next/server";
import { getBranches, addBranch } from "@/lib/db";

export async function GET() {
  try {
    const branches = await getBranches();
    return NextResponse.json(branches);
  } catch (err) {
    console.error("GET /api/branches", err);
    return NextResponse.json(
      { error: "Failed to load branches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const branch = await addBranch(name.trim());
  return NextResponse.json(branch);
}
