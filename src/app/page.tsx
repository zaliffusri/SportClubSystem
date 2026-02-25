"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Branch = { id: string; name: string };
type LeaderboardEntry = { memberId: string; memberName: string; totalPoints: number };

export default function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then(async (r) => {
        if (!r.ok) throw new Error(` ${r.status}`);
        const text = await r.text();
        if (!text.trim()) return [];
        try {
          return JSON.parse(text) as Branch[];
        } catch {
          throw new Error("Invalid response");
        }
      })
      .then((data) => {
        setBranches(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length) setSelectedBranch((prev) => prev || data[0].id);
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (branches.length === 0) return;
    const load = async () => {
      const results: Record<string, LeaderboardEntry[]> = {};
      for (const b of branches) {
        try {
          const r = await fetch(`/api/leaderboard?branchId=${b.id}`);
          const text = await r.text();
          results[b.id] = r.ok && text.trim() ? (JSON.parse(text) as LeaderboardEntry[]) : [];
        } catch {
          results[b.id] = [];
        }
      }
      setLeaderboards(results);
    };
    load();
  }, [branches]);

  const refreshLeaderboards = () => {
    setLeaderboards({});
    if (branches.length === 0) return;
    const load = async () => {
      const results: Record<string, LeaderboardEntry[]> = {};
      for (const b of branches) {
        try {
          const r = await fetch(`/api/leaderboard?branchId=${b.id}`);
          const text = await r.text();
          results[b.id] = r.ok && text.trim() ? (JSON.parse(text) as LeaderboardEntry[]) : [];
        } catch {
          results[b.id] = [];
        }
      }
      setLeaderboards(results);
    };
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="heading text-2xl md:text-3xl">Leaderboard by Branch</h1>
        <button onClick={refreshLeaderboards} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBranch(b.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              selectedBranch === b.id
                ? "bg-primary-500 text-surface-950 shadow-glow-sm"
                : "border border-white/15 bg-white/5 text-slate-400 hover:border-primary-500/40 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {selectedBranch && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 bg-white/5 px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              {branches.find((b) => b.id === selectedBranch)?.name ?? "Leaderboard"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(leaderboards[selectedBranch] ?? []).map((entry, i) => (
                  <tr key={entry.memberId} className="transition hover:bg-white/5">
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold ${
                          i === 0
                            ? "bg-amber-500/20 text-amber-400 shadow-glow-sm"
                            : i === 1
                              ? "bg-slate-500/20 text-slate-300"
                              : i === 2
                                ? "bg-amber-700/20 text-amber-500"
                                : "bg-white/5 text-slate-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{entry.memberName}</td>
                    <td className="px-6 py-4 text-right font-semibold text-primary-400">
                      {entry.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(leaderboards[selectedBranch] ?? []).length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              No members or points yet.{" "}
              <Link href="/members" className="text-primary-400 hover:underline">
                Add members
              </Link>{" "}
              and{" "}
              <Link href="/points" className="text-primary-400 hover:underline">
                record points
              </Link>
              .
            </div>
          )}
        </div>
      )}
    </div>
  );
}
