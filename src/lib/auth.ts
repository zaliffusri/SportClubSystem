import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { addAdmin, getAdminByEmail, getMemberByEmail, getAdmins, initDb } from "./db";

const SESSION_COOKIE = "sport_session";
const DEFAULT_PASSWORD = "P@ssw0rd";
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  return compare(password, hashStr);
}

export async function ensureDefaultAdmin(): Promise<void> {
  await initDb();
  const admins = await getAdmins();
  if (admins.length > 0) return;
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  await addAdmin("admin@sportclub.com", passwordHash, "Admin");
}

export type SessionUser =
  | { role: "admin"; id: string; email: string }
  | { role: "member"; id: string; email: string };

const SECRET = process.env.SESSION_SECRET ?? "sport-club-dev-secret-change-in-production";

function sign(value: string): string {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function encodeSession(user: SessionUser): string {
  const payload = JSON.stringify(user);
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function decodeSession(cookieValue: string): SessionUser | null {
  try {
    const [encoded, sig] = cookieValue.split(".");
    if (!encoded || !sig || sign(encoded) !== sig) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (payload?.role === "admin" && payload?.id && payload?.email) return payload as SessionUser;
    if (payload?.role === "member" && payload?.id && payload?.email) return payload as SessionUser;
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decodeSession(value);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<SessionUser | { error: string }> {
  await ensureDefaultAdmin();
  const admin = await getAdminByEmail(email);
  if (admin) {
    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) return { error: "Invalid email or password" };
    return { role: "admin", id: admin.id, email: admin.email };
  }
  const member = await getMemberByEmail(email);
  if (member?.passwordHash) {
    const ok = await verifyPassword(password, member.passwordHash);
    if (!ok) return { error: "Invalid email or password" };
    return { role: "member", id: member.id, email: member.email ?? email };
  }
  return { error: "Invalid email or password" };
}

export { DEFAULT_PASSWORD };
