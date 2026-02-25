"use client";

import { useEffect, useState } from "react";

type Challenge = {
  id: string;
  gameName: string;
  challengerMemberId: string;
  challengerName: string;
  opponentMemberId: string;
  opponentName: string;
  pointsWagered: number;
  status: string;
};

export default function ChallengesAdminPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [declaring, setDeclaring] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const accepted = (Array.isArray(list) ? list : []).filter(
          (c: Challenge) => c.status === "accepted"
        );
        setChallenges(accepted);
      })
      .finally(() => setLoading(false));
  }, []);

  const declareWinner = async (c: Challenge) => {
    const wid = winnerId[c.id] || c.challengerMemberId;
    if (!wid) return;
    setDeclaring(c.id);
    try {
      const res = await fetch(`/api/challenges/${c.id}/winner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerMemberId: wid }),
      });
      if (res.ok) setChallenges((prev) => prev.filter((x) => x.id !== c.id));
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed");
      }
    } finally {
      setDeclaring(null);
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
    <div className="space-y-6">
      <h1 className="heading text-2xl md:text-3xl">Declare challenge winners</h1>
      <p className="text-slate-500">
        Only accepted challenges are shown. Choose the winner: they gain the wager (+pts), the loser is deducted the wager (-pts).
      </p>

      {challenges.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No accepted challenges waiting for winner declaration.
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((c) => (
            <div key={c.id} className="card p-6">
              <p className="font-medium text-slate-200">
                {c.gameName} — {c.pointsWagered} pts each (winner +{c.pointsWagered}, loser −{c.pointsWagered})
              </p>
              <p className="mt-1 text-slate-500">
                {c.challengerName} vs {c.opponentName}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <label className="text-sm font-medium text-slate-400">Winner:</label>
                <select
                  value={winnerId[c.id] ?? c.challengerMemberId}
                  onChange={(e) =>
                    setWinnerId((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  className="input w-48"
                >
                  <option value={c.challengerMemberId}>{c.challengerName}</option>
                  <option value={c.opponentMemberId}>{c.opponentName}</option>
                </select>
                <button
                  type="button"
                  onClick={() => declareWinner(c)}
                  disabled={declaring === c.id}
                  className="btn-primary"
                >
                  {declaring === c.id ? "…" : "Declare winner"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
