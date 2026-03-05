"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardEntry = {
  userId: string;
  userName: string;
  totalPoints: number;
  branchId?: string | null;
  branchName?: string;
};

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetch("/api/leaderboard");
      const text = await r.text();
      setLeaderboard(r.ok && text.trim() ? (JSON.parse(text) as LeaderboardEntry[]) : []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        <h1 className="heading text-2xl md:text-3xl">Leaderboard</h1>
        <button onClick={() => { setLoading(true); load(); }} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/10 bg-white/5 px-3 py-3 sm:px-6 sm:py-4">
          <h2 className="font-display text-base font-semibold text-slate-100 sm:text-lg">Rankings</h2>
        </div>
        <div className="overflow-x-auto -mx-px">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rank
                </th>
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Member
                </th>
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden xs:table-cell">
                  Branch
                </th>
                <th className="cell text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.map((entry, i) => (
                <tr key={entry.userId} className="transition hover:bg-white/5">
                  <td className="cell">
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
                  <td className="cell font-medium text-slate-200">{entry.userName}</td>
                  <td className="cell text-slate-400">{entry.branchName ?? "—"}</td>
                  <td className="cell text-right font-semibold text-primary-400">
                    {entry.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leaderboard.length === 0 && (
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
    </div>
  );
}
