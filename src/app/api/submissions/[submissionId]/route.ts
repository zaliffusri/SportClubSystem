import { NextResponse } from "next/server";
import { deleteSubmission } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;
  const ok = await deleteSubmission(submissionId);
  if (!ok) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
