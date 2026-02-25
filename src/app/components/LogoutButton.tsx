"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-white/5 hover:text-red-400"
    >
      Logout
    </button>
  );
}
