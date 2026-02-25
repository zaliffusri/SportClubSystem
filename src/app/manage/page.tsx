import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const LINKS = [
  { href: "/games", label: "Games", description: "Create and manage games" },
  { href: "/members", label: "Members", description: "Add and edit members" },
  { href: "/points", label: "Add points", description: "Record points for a game" },
  { href: "/challenges/admin", label: "Declare winners", description: "Set challenge results" },
  { href: "/audit", label: "Audit log", description: "View action history" },
];

export default async function ManagePage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  return (
    <div className="space-y-8">
      <h1 className="heading text-2xl md:text-3xl">Manage</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card block p-6 transition hover:border-primary-500/30 hover:shadow-glow-sm"
          >
            <h2 className="font-display font-semibold text-slate-100">{item.label}</h2>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
