"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Game = { id: string; name: string; date: string; type?: string };
type Submission = { id: string; gameId: string; memberId: string; answer: string; createdAt: string };
type Member = { id: string; name: string; branchId: string };

export default function EvaluateGamePage() {
  const params = useParams();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);

  const load = async () => {
    if (!gameId) return;
    const [gameRes, subRes, membersRes] = await Promise.all([
      fetch(`/api/games/${gameId}`),
      fetch(`/api/submissions?gameId=${gameId}`),
      fetch("/api/members"),
    ]);
    const gameData = gameRes.ok ? await gameRes.json().catch(() => null) : null;
    const subData = subRes.ok ? await subRes.json().catch(() => []) : [];
    const membersData = membersRes.ok ? await membersRes.json().catch(() => []) : [];
    setGame(gameData);
    setSubmissions(Array.isArray(subData) ? subData : []);
    setMembers(Array.isArray(membersData) ? membersData : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [gameId]);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const handleAward = async (submissionId: string, memberId: string) => {
    const pointsStr = pointsInputs[submissionId] ?? "";
    const points = Number(pointsStr);
    if (Number.isNaN(points) || points < 0) {
      alert("Enter a valid number of points.");
      return;
    }
    setAwarding(submissionId);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, memberId, points }),
      });
      if (res.ok) {
        await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
        setPointsInputs((prev) => ({ ...prev, [submissionId]: "" }));
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to award points");
      }
    } finally {
      setAwarding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
        <p className="font-medium">Game not found</p>
        <Link href="/games" className="mt-2 inline-block text-primary-400 hover:underline">
          Back to Games
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/games" className="text-slate-500 hover:text-primary-600">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Evaluate: {game.name}</h1>
      </div>
      <p className="text-slate-600">
        Review answers and award points. Points will count toward each member&apos;s branch leaderboard.
      </p>

      {submissions.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p>No submissions yet.</p>
          <p className="mt-2 text-sm">
            Share the <Link href={`/play/${gameId}`} className="text-primary-400 hover:underline">game form</Link> so
            participants can submit answers.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Answer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Award points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="transition hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-slate-200">{memberName(sub.memberId)}</td>
                    <td className="max-w-xs px-6 py-4 text-slate-400 whitespace-pre-wrap">{sub.answer || "—"}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(sub.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="Points"
                          className="input w-24 text-right"
                          value={pointsInputs[sub.id] ?? ""}
                          onChange={(e) =>
                            setPointsInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleAward(sub.id, sub.memberId)}
                          disabled={awarding === sub.id}
                          className="btn-primary text-sm"
                        >
                          {awarding === sub.id ? "…" : "Award"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Link href={`/play/${gameId}`} className="btn-secondary" target="_blank" rel="noopener noreferrer">
          Open form & QR
        </Link>
        <Link href="/points" className="btn-secondary">
          Add points (manual)
        </Link>
      </div>
    </div>
  );
}
