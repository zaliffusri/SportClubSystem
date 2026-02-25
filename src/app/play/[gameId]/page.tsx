"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

type Game = { id: string; name: string; date: string; type?: string };
type Member = { id: string; name: string; branchId: string };
type SessionUser = { role: "admin" | "member"; id: string; email: string };

export default function PlayGamePage() {
  const params = useParams();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState("");
  const [answer, setAnswer] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    Promise.all([
      fetch(`/api/games/${gameId}`).then(async (r) => {
        if (!r.ok) return null;
        const t = await r.text();
        try {
          return t.trim() ? JSON.parse(t) : null;
        } catch {
          return null;
        }
      }),
      fetch("/api/auth/session").then(async (r) => {
        if (!r.ok) return { user: null };
        const t = await r.text();
        try {
          const data = t.trim() ? JSON.parse(t) : {};
          return data.user ?? null;
        } catch {
          return null;
        }
      }),
    ]).then(([g, user]) => {
      setGame(g ?? null);
      const u = user && typeof user === "object" && user.role && user.id ? user : null;
      setSession(u);
      if (u?.role === "member") setMemberId(u.id);
      setLoading(false);
    });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !session || session.role !== "admin") return;
    fetch("/api/members")
      .then((r) => (r.ok ? r.json() : []))
      .then((m: Member[]) => {
        setMembers(Array.isArray(m) ? m : []);
        if (Array.isArray(m) && m.length) setMemberId(m[0].id);
      })
      .catch(() => setMembers([]));
  }, [gameId, session]);

  useEffect(() => {
    if (typeof window === "undefined" || !gameId) return;
    const url = `${window.location.origin}/play/${gameId}`;
    QRCode.toDataURL(url, { width: 220, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      window.location.href = `/login?from=${encodeURIComponent(`/play/${gameId}`)}`;
      return;
    }
    const effectiveMemberId = session.role === "admin" ? memberId : session.id;
    if (!gameId || !effectiveMemberId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, memberId: effectiveMemberId, answer: answer.trim() }),
      });
      if (res.ok) setSubmitted(true);
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to submit");
      }
    } finally {
      setSubmitting(false);
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

  if (game.type !== "guessing") {
    return (
      <div className="card border-amber-500/30 bg-amber-500/10 p-6 text-center text-amber-400">
        <p className="font-medium">This game does not accept answers here.</p>
        <Link href="/games" className="mt-2 inline-block text-primary-400 hover:underline">
          Back to Games
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card mx-auto max-w-md space-y-6 p-6 text-center border-primary-500/30 bg-primary-500/10">
        <p className="text-lg font-semibold text-primary-400">Answer submitted successfully!</p>
        <p className="text-slate-400">The sport club team will evaluate and award points.</p>
        <Link href="/" className="btn-primary inline-block">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="card p-6">
        <h1 className="font-display text-xl font-bold text-slate-100">{game.name}</h1>
        <p className="mt-1 text-slate-500">{game.date}</p>
        <p className="mt-4 text-slate-400">Submit your answer below. The team will evaluate and award points.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {!session ? (
          <div className="card flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-slate-400">Sign in to submit your answer. Your answer will be recorded under your account.</p>
            <Link
              href={`/login?from=${encodeURIComponent(`/play/${gameId}`)}`}
              className="btn-primary"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4 p-6">
            <h2 className="font-display font-semibold text-slate-100">Your answer</h2>
            {session.role === "admin" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Submit as (member)</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="input"
                  required
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Submitting as yourself ({session.email})</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Your answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input min-h-[120px] resize-y"
                placeholder="Type your answer here..."
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit answer"}
            </button>
          </form>
        )}

        <div className="card p-6">
          <h2 className="mb-2 font-display font-semibold text-slate-100">Scan to open this form</h2>
          <p className="mb-4 text-sm text-slate-500">Share this QR so others can submit answers.</p>
          {qrDataUrl ? (
            <div className="inline-block rounded-lg border border-white/20 bg-white/10 p-2">
              <img src={qrDataUrl} alt="QR code for game form" width={220} height={220} />
            </div>
          ) : (
            <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-white/10" />
          )}
        </div>
      </div>
    </div>
  );
}
