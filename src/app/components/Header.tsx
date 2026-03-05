import Link from "next/link";
import { getSession } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const session = await getSession();
  const canManage = session?.role === "admin" || session?.role === "finance";

  const links = [
    { href: "/", label: "Leaderboard" },
    ...(session
      ? [
          { href: "/challenges", label: "Challenges" },
          { href: "/my-games", label: "My games" },
          ...(canManage ? [{ href: "/manage", label: "Manage" }] : []),
          { href: "/profile", label: "Profile" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-3 py-3 sm:px-4 sm:py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-primary-400 transition hover:text-primary-300 sm:text-xl"
          style={{ textShadow: "0 0 24px rgba(6, 182, 212, 0.4)" }}
        >
          CTSB Sports
        </Link>
        <HeaderNav links={links} session={session ? { email: session.email } : null} />
      </div>
    </header>
  );
}
