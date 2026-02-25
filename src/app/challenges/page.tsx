"use client";

import { useEffect, useState } from "react";

type Game = { id: string; name: string; type?: string };
type Member = { id: string; name: string };
type Challenge = {
  id: string;
  gameName: string;
  challengerName: string;
  opponentName: string;
  pointsWagered: number;
  status: string;
  winnerMemberId?: string;
  createdAt: string;
};

export default function ChallengesPage() {
  const [incoming, setIncoming] = useState<Challenge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [gameId, setGameId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [points, setPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const challengeGames = games.filter((g) => g.type === "challenge");

  const load = () => {
    Promise.all([
      fetch("/api/challenges?filter=notifications").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/challenges?filter=mine").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/games").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/members").then((r) => (r.ok ? r.json() : [])),
    ]).then(([inc, c, g, m]) => {
      setIncoming(Array.isArray(inc) ? inc : []);
      setChallenges(Array.isArray(c) ? c : []);
      setGames(Array.isArray(g) ? g : []);
      setMembers(Array.isArray(m) ? m : []);
    });
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/challenges?filter=notifications").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/challenges?filter=mine").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/games").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/members").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([inc, c, g, m]) => {
        setIncoming(Array.isArray(inc) ? inc : []);
        setChallenges(Array.isArray(c) ? c : []);
        setGames(Array.isArray(g) ? g : []);
        setMembers(Array.isArray(m) ? m : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(points);
    if (Number.isNaN(num) || num < 1) {
      alert("Points must be at least 1");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, opponentMemberId: opponentId, pointsWagered: num }),
      });
      if (res.ok) {
        setShowForm(false);
        setGameId("");
        setOpponentId("");
        setPoints("");
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to create challenge");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (id: string, action: "accept" | "reject") => {
    setActing(id);
    try {
      const res = await fetch(`/api/challenges/${id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) load();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed");
      }
    } finally {
      setActing(null);
    }
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="heading text-2xl md:text-3xl">Challenges</h1>
        {challengeGames.length > 0 && members.length > 1 && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            {showForm ? "Cancel" : "New challenge"}
          </button>
        )}
      </div>

      {incoming.length > 0 && (
        <div className="card overflow-hidden">
          <h2 className="border-b border-white/10 bg-white/5 px-4 py-3 font-display text-sm font-semibold text-slate-300">
            Incoming — accept or reject
          </h2>
          <div className="divide-y divide-white/5">
            {incoming.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-200">
                    <strong>{c.challengerName}</strong> → {c.gameName} ({c.pointsWagered} pts)
                  </p>
                  <p className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(c.id, "accept")}
                    disabled={acting === c.id}
                    className="btn-primary text-sm"
                  >
                    {acting === c.id ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(c.id, "reject")}
                    disabled={acting === c.id}
                    className="btn-secondary text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100">Challenge another member</h2>
          <p className="text-sm text-slate-500">
            Choose a challenge game, opponent, and points to wager. When they accept, both of you put in that many points (e.g. 2 pts each = 4 total at stake). Winner gains the wager (+2), loser loses the wager (-2). Admin declares winner.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Game</label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select a challenge game</option>
              {challengeGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Opponent</label>
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select opponent</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Points to wager</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="input w-32"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Send challenge"}
          </button>
        </form>
      )}

      {challengeGames.length === 0 && (
        <div className="card border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
          No challenge games yet. An admin must create a game with type &quot;Challenge&quot; first.
        </div>
      )}

      <div className="card overflow-hidden">
        <h2 className="border-b border-white/10 bg-white/5 px-6 py-4 font-display text-lg font-semibold text-slate-100">
          My challenges
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Challenger
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Opponent
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {challenges.map((c) => (
                <tr key={c.id} className="transition hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-200">{c.gameName}</td>
                  <td className="px-6 py-4 text-slate-400">{c.challengerName}</td>
                  <td className="px-6 py-4 text-slate-400">{c.opponentName}</td>
                  <td className="px-6 py-4 text-slate-400">{c.pointsWagered}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : c.status === "accepted"
                            ? "bg-primary-500/20 text-primary-400"
                            : c.status === "completed"
                              ? "bg-primary-500/20 text-primary-400"
                              : "bg-white/10 text-slate-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {challenges.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-500">No challenges yet.</div>
        )}
      </div>
    </div>
  );
}
