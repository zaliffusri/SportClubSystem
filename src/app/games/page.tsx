"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = { id: string; name: string; date: string; description?: string; type?: string };

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<"standard" | "guessing" | "challenge">("standard");

  const loadGames = () =>
    fetch("/api/games")
      .then(async (r) => {
        if (!r.ok) return [];
        const text = await r.text();
        try {
          return text.trim() ? (JSON.parse(text) as Game[]) : [];
        } catch {
          return [];
        }
      })
      .then(setGames);

  useEffect(() => {
    loadGames().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        date,
        description: description.trim() || undefined,
        type: gameType,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to add game");
      return;
    }
    setName("");
    setDate("");
    setDescription("");
    setGameType("standard");
    setShowForm(false);
    loadGames();
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
        <h1 className="heading text-2xl md:text-3xl">Games</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cancel" : "Add Game"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100">New Game</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Game name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Badminton Tournament"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Game type</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as "standard" | "guessing" | "challenge")}
              className="input"
            >
              <option value="standard">Standard (points added manually)</option>
              <option value="guessing">Guessing (form + QR for answers, then evaluate)</option>
              <option value="challenge">Challenge (members challenge each other, admin declares winner)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="e.g. Monthly friendly match"
            />
          </div>
          <button type="submit" className="btn-primary">
            Create Game
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {games.map((g) => (
                <tr key={g.id} className="transition hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-200">{g.name}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {g.type === "guessing" ? "Guessing" : g.type === "challenge" ? "Challenge" : "Standard"}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{g.date}</td>
                  <td className="px-6 py-4 text-slate-500">{g.description ?? "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="flex flex-wrap justify-end gap-2">
                      {g.type === "guessing" && (
                        <>
                          <Link
                            href={`/play/${g.id}`}
                            className="text-primary-400 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Form & QR
                          </Link>
                          <Link
                            href={`/games/${g.id}/evaluate`}
                            className="text-primary-400 hover:underline"
                          >
                            Evaluate
                          </Link>
                        </>
                      )}
                      <Link href={`/points?gameId=${g.id}`} className="text-slate-400 hover:text-primary-400 hover:underline">
                        Add points
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {games.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            No games yet. Add a game to start recording points.
          </div>
        )}
      </div>
    </div>
  );
}
