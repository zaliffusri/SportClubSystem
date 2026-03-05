"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LogoutButton } from "./LogoutButton";

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  session: { email: string } | null;
};

const linkClass =
  "block rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-primary-400 md:inline-block";

export function HeaderNav({ links, session }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative flex items-center gap-1 text-sm" ref={panelRef}>
      {/* Desktop nav: visible from md up */}
      <nav className="hidden md:flex md:items-center md:gap-1">
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
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

      {/* Mobile: hamburger + dropdown */}
      <div className="flex items-center md:hidden">
        {session && (
          <span className="mr-2 max-w-[120px] truncate text-xs text-slate-500 sm:max-w-[180px]">
            {session.email}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-primary-400"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-white/10 bg-surface-900 py-2 shadow-xl md:hidden">
          <nav className="flex flex-col">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2.5 text-slate-300 hover:bg-white/5 hover:text-primary-400"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            {session ? (
              <div className="mt-2 border-t border-white/10 pt-2">
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="mx-2 mt-2 rounded-lg bg-primary-500/20 py-2.5 text-center font-medium text-primary-400"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
