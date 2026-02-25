import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/session"];
const PLAY_FORM_PREFIX = "/play/";
// Leaderboard (home) can be viewed without login — allow its APIs
const PUBLIC_API_PATHS = ["/api/branches", "/api/leaderboard"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")))) return NextResponse.next();
  if (path === "/") return NextResponse.next();
  if (path.startsWith(PLAY_FORM_PREFIX)) return NextResponse.next();
  if (PUBLIC_API_PATHS.some((p) => path === p || path.startsWith(p + "?"))) return NextResponse.next();
  if (/^\/api\/games\/[^/]+$/.test(path) || path === "/api/members")
    return NextResponse.next();
  const session = request.cookies.get("sport_session")?.value;
  if (!session) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
