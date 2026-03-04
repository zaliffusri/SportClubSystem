"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

type Game = { id: string; name: string; date: string; description?: string };

export default function JoinQRPage() {
  const params = useParams();
  const gameId = params?.gameId as string;
  const [game, setGame] = useState<Game | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;
    const url = `${window.location.origin}/join/${gameId}`;
    setJoinUrl(url);
    QRCode.toDataURL(url, { width: 320, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGame)
      .catch(() => setGame(null));
  }, [gameId]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/games" className="text-primary-400 hover:underline text-sm">
        ← Back to Games
      </Link>

      <div className="card p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-100">
          {game?.name ?? "Game"}
        </h1>
        {game?.date && <p className="mt-1 text-slate-500">{game.date}</p>}
        <p className="mt-4 text-sm text-slate-400">
          Scan to join this game. You’ll sign in and earn 1 point for joining.
        </p>

        {qrDataUrl && (
          <div className="mt-8 flex justify-center">
            <img src={qrDataUrl} alt="Join game QR code" className="rounded-lg border border-white/10" />
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500 break-all">
          {joinUrl}
        </p>
      </div>
    </div>
  );
}
