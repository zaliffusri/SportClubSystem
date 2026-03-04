"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Game = { id: string; name: string; date: string; description?: string; type?: string };

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<{ joined?: boolean; alreadyJoined?: boolean; message?: string; points?: number } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGame)
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : { user: null })
      .then((data) => {
        const user = data?.user;
        setHasSession(!!(user && user.id && user.role));
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !hasSession || !sessionChecked || !game || result !== null) return;
    setJoining(true);
    fetch(`/api/games/${gameId}/join`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => setResult(data))
      .catch(() => setResult({ message: "Something went wrong." }))
      .finally(() => setJoining(false));
  }, [gameId, hasSession, sessionChecked, game, result]);

  useEffect(() => {
    if (sessionChecked && !hasSession && gameId) {
      router.replace(`/login?from=${encodeURIComponent(`/join/${gameId}`)}`);
    }
  }, [sessionChecked, hasSession, gameId, router]);

  if (loading || !game) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="card p-6">
        <h1 className="font-display text-xl font-semibold text-slate-100">{game.name}</h1>
        {game.date && <p className="mt-1 text-sm text-slate-500">Date: {game.date}</p>}
        {game.description && <p className="mt-2 text-slate-400">{game.description}</p>}

        {joining && (
          <p className="mt-6 text-primary-400">Joining game…</p>
        )}

        {result && !joining && (
          <div className="mt-6 space-y-4">
            <p className={result.alreadyJoined ? "text-slate-400" : "text-primary-400"}>
              {result.message}
            </p>
            {result.joined && result.points != null && (
              <p className="text-sm text-slate-500">You earned {result.points} point for joining.</p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/my-games" className="btn-primary">
                My games
              </Link>
              <Link href="/" className="btn-secondary">
                Leaderboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
