"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GameWithPoints = {
  id: string;
  name: string;
  date: string;
  description?: string;
  type?: string;
  totalPointsFromGame: number;
};

export default function MyGamesPage() {
  const [games, setGames] = useState<GameWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetch("/api/games/joined")
      .then((r) => {
        if (r.status === 401) setUnauthorized(true);
        return r.ok ? r.json() : { games: [] };
      })
      .then((data) => setGames(Array.isArray(data.games) ? data.games : []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  if (unauthorized) {
    return (
      <div className="card border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <p className="text-amber-400">Sign in to see your games.</p>
        <Link href="/login" className="mt-3 inline-block text-primary-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="heading text-2xl md:text-3xl">Games I&apos;ve joined</h1>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Points from this game
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {games.map((g) => (
                <tr key={g.id} className="transition hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-200">{g.name}</td>
                  <td className="px-6 py-4 text-slate-400">{g.date}</td>
                  <td className="px-6 py-4 text-slate-500">{g.description ?? "—"}</td>
                  <td className="px-6 py-4 text-right font-semibold text-primary-400">
                    {g.totalPointsFromGame}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {games.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            You haven&apos;t joined any games yet. Scan a game QR or use a join link to participate and earn points.
          </div>
        )}
      </div>
    </div>
  );
}
