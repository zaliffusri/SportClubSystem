"use client";

import { useEffect, useState } from "react";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userRole: string;
  userEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const actionLabel = (a: string) =>
    a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="heading text-2xl md:text-3xl">Audit log</h1>
      <p className="text-slate-500">
        Record of important actions. {logs.length} most recent entries.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {actionLabel(log.action)}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {log.userEmail} ({log.userRole})
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {log.entityType} #{log.entityId.slice(0, 8)}
                  </td>
                  <td className="max-w-xs px-6 py-4 text-sm text-slate-500">
                    {Object.keys(log.details ?? {}).length > 0
                      ? JSON.stringify(log.details)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-500">No audit entries yet.</div>
        )}
      </div>
    </div>
  );
}
