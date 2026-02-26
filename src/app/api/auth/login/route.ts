import { NextResponse } from "next/server";
import { loginWithEmailPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });
    const result = await loginWithEmailPassword(email.trim(), password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    await setSessionCookie(result);
    return NextResponse.json({ ok: true, role: result.role, email: result.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Login error", err);
    return NextResponse.json({ error: "Login failed", detail: message }, { status: 500 });
  }
}
