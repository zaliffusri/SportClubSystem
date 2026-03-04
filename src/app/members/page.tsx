"use client";

import { useEffect, useState } from "react";

type Branch = { id: string; name: string };
type Member = {
  id: string;
  name: string;
  branchId?: string;
  email?: string;
  status?: "active" | "inactive";
  role?: "admin" | "member";
};

export default function MembersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editRole, setEditRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [needingAccountsCount, setNeedingAccountsCount] = useState(0);
  const [creatingAccounts, setCreatingAccounts] = useState(false);

  const load = async () => {
    const [profileRes, branchesRes, membersRes] = await Promise.all([
      fetch("/api/auth/profile"),
      fetch("/api/branches"),
      fetch("/api/members"),
    ]);
    const profile = profileRes.ok ? await profileRes.json().catch(() => null) : null;
    setIsAdmin(profile?.role === "admin");
    const safeJson = async (r: Response, fallback: Branch[] | Member[]) => {
      if (!r.ok) return fallback;
      const text = await r.text();
      try {
        return text.trim() ? JSON.parse(text) : fallback;
      } catch {
        return fallback;
      }
    };
    const branchesData = (await safeJson(branchesRes, [])) as Branch[];
    const membersData = (await safeJson(membersRes, [])) as Member[];
    setBranches(branchesData);
    setMembers(membersData);
    if (branchesData.length && !branchId) setBranchId(branchesData[0].id);
    if (branchesData.length && !formBranchId) setFormBranchId(branchesData[0].id);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/members/create-accounts")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setNeedingAccountsCount(data.count ?? 0))
      .catch(() => setNeedingAccountsCount(0));
  }, [members]);

  const handleCreateAccounts = async () => {
    setCreatingAccounts(true);
    try {
      const res = await fetch("/api/members/create-accounts", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Failed to create accounts");
        return;
      }
      setNeedingAccountsCount(0);
      load();
      const msg =
        data.created === 0
          ? data.message ?? "All members already have accounts."
          : `${data.message}\n\nEmails created:\n${(data.accounts ?? []).map((a: { name: string; email: string }) => `${a.name}: ${a.email}`).join("\n")}`;
      alert(msg);
    } finally {
      setCreatingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), branchId: formBranchId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to add member");
      return;
    }
    setName("");
    setEmail("");
    setShowForm(false);
    load();
  };

  const filterByBranch = branchId ? members.filter((m) => m.branchId === branchId) : members;
  const displayRole = (r?: "admin" | "member") => (r === "admin" ? "Admin" : "User");
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email ?? "");
    setEditBranchId(m.branchId ?? "");
    setEditStatus(m.status ?? "active");
    setEditRole(m.role ?? "member");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditBranchId("");
    setEditStatus("active");
    setEditRole("member");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const body: { name: string; email: string; branchId?: string; status?: "active" | "inactive"; role?: "admin" | "member" } = {
        name: editName.trim(),
        email: editEmail.trim(),
      };
      if (isAdmin) {
        body.branchId = editBranchId;
        body.status = editStatus;
        body.role = editRole;
      }
      const res = await fetch(`/api/members/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to update member");
        return;
      }
      cancelEdit();
      load();
    } finally {
      setSaving(false);
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
        <h1 className="heading text-2xl md:text-3xl">Members</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm && branches.length) setFormBranchId(branchId || branches[0].id);
            }}
            className="btn-primary"
          >
            {showForm ? "Cancel" : "Add Member"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100">New Member</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Colleague name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Email (for login)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="member@example.com"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Default password: P@ssw0rd</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Branch</label>
            <select
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              className="input"
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Add Member
          </button>
        </form>
      )}

      {isAdmin && needingAccountsCount > 0 && (
        <div className="card flex items-center justify-between gap-4 border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-amber-400">
            <strong>{needingAccountsCount}</strong> member{needingAccountsCount !== 1 ? "s" : ""} don&apos;t have
            login accounts yet.
          </p>
          <button
            type="button"
            onClick={handleCreateAccounts}
            disabled={creatingAccounts}
            className="btn-primary whitespace-nowrap"
          >
            {creatingAccounts ? "Creating…" : "Create accounts for all"}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setBranchId("")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              !branchId ? "bg-primary-500 text-surface-950 shadow-glow-sm" : "border border-white/15 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            All branches
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchId(b.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                branchId === b.id ? "bg-primary-500 text-surface-950 shadow-glow-sm" : "border border-white/15 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Branch
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filterByBranch.map((m) => (
                <tr key={m.id} className="transition hover:bg-white/5">
                  {editingId === m.id ? (
                    <>
                      <td className="px-6 py-4" colSpan={isAdmin ? 6 : 5}>
                        <form
                          onSubmit={handleSaveEdit}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input w-40"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Email
                            </label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="input w-48"
                              required
                            />
                          </div>
                          {isAdmin && (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Branch
                                </label>
                                <select
                                  value={editBranchId}
                                  onChange={(e) => setEditBranchId(e.target.value)}
                                  className="input w-40"
                                >
                                  <option value="">—</option>
                                  {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Status
                                </label>
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                                  className="input w-28"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Role
                                </label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as "admin" | "member")}
                                  className="input w-28"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">User</option>
                                </select>
                              </div>
                            </>
                          )}
                          <div className="ml-auto flex gap-2">
                            <button
                              type="submit"
                              className="btn-primary text-sm"
                              disabled={saving}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="btn-secondary text-sm"
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-slate-200">{m.name}</td>
                      <td className="px-6 py-4 text-slate-400">{m.email || "—"}</td>
                      <td className="px-6 py-4 text-slate-400">{m.branchId ? branchName(m.branchId) : "—"}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-slate-400">{displayRole(m.role)}</td>
                      )}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            (m.status ?? "active") === "active"
                              ? "bg-primary-500/20 text-primary-400"
                              : "bg-white/10 text-slate-500"
                          }`}
                        >
                          {(m.status ?? "active") === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="text-primary-400 hover:underline text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filterByBranch.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            No members in this filter. Add members to get started.
          </div>
        )}
      </div>
    </div>
  );
}
