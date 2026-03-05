"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Game = { id: string; name: string; date: string };
type Member = { id: string; name: string; branchId: string };

export default function PointsPage() {
  const searchParams = useSearchParams();
  const presetGameId = searchParams.get("gameId") ?? "";

  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gameId, setGameId] = useState(presetGameId);
  const [memberId, setMemberId] = useState("");
  const [points, setPoints] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (presetGameId) setGameId(presetGameId);
  }, [presetGameId]);

  useEffect(() => {
    const safeJson = async (r: Response, fallback: Game[] | Member[]) => {
      if (!r.ok) return fallback;
      const text = await r.text();
      try {
        return text.trim() ? JSON.parse(text) : fallback;
      } catch {
        return fallback;
      }
    };
    Promise.all([
      fetch("/api/games").then((r) => safeJson(r, []) as Promise<Game[]>),
      fetch("/api/members").then((r) => safeJson(r, []) as Promise<Member[]>),
    ])
      .then(([g, m]) => {
        setGames(g);
        setMembers(m);
        if (presetGameId && !gameId) setGameId(presetGameId);
        if (g.length && !gameId) setGameId(g[0].id);
        if (m.length && !memberId) setMemberId(m[0].id);
      })
      .finally(() => setLoading(false));
  }, [presetGameId, gameId, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(points);
    if (Number.isNaN(num) || num < 0) {
      alert("Enter a valid number of points.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, memberId, points: num }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to add points");
      return;
    }
    setPoints("");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="heading text-2xl md:text-3xl">Add Points</h1>
      <p className="text-slate-500">
        Record points for a colleague from a game. Points will count toward their branch
        leaderboard.
      </p>

      <form onSubmit={handleSubmit} className="card max-w-md space-y-4 p-4 sm:p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Game</label>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="input"
            required
          >
            <option value="">Select a game</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.date})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Member</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="input"
            required
          >
            <option value="">Select a member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Points</label>
          <input
            type="number"
            min="0"
            step="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="input"
            placeholder="0"
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Adding…" : "Add Points"}
        </button>
      </form>

      {games.length === 0 && (
        <p className="text-slate-500">
          Create a <a href="/games" className="text-primary-600 hover:underline">game</a> first.
        </p>
      )}
      {members.length === 0 && (
        <p className="text-slate-500">
          Add <a href="/members" className="text-primary-600 hover:underline">members</a> first.
        </p>
      )}
    </div>
  );
}
