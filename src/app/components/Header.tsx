import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-primary-400 transition hover:text-primary-300"
          style={{ textShadow: "0 0 24px rgba(6, 182, 212, 0.4)" }}
        >
          Sport Club Points
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400"
          >
            Leaderboard
          </Link>
          {session && (
            <>
              <Link
                href="/challenges"
                className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400"
              >
                Challenges
              </Link>
              {isAdmin ? (
                <Link
                  href="/manage"
                  className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400"
                >
                  Manage
                </Link>
              ) : (
                <Link
                  href="/members"
                  className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400"
                >
                  My details
                </Link>
              )}
              <Link
                href="/profile"
                className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400"
              >
                Profile
              </Link>
            </>
          )}
          {session ? (
            <span className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
              <span className="text-slate-500">{session.email}</span>
              <LogoutButton />
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary-500/20 px-3 py-2 font-medium text-primary-400 transition hover:bg-primary-500/30 hover:text-primary-300"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
