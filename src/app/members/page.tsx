"use client";

import { useEffect, useState } from "react";

type Branch = { id: string; name: string };
type Member = {
  id: string;
  name: string;
  branchId?: string;
  email?: string;
  status?: "active" | "inactive";
  role?: "admin" | "member" | "finance";
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
  const [formRole, setFormRole] = useState<"member" | "admin" | "finance">("member");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
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
    setIsAdmin(profile?.role === "admin" || profile?.role === "finance");
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
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        branchId: formRole === "member" ? formBranchId : undefined,
        role: formRole,
      }),
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

  const filterByBranch = branchId
    ? members.filter((m) => m.branchId === branchId || m.role === "finance")
    : members;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const roleLabel = (r?: string) => (r === "admin" ? "Admin" : r === "finance" ? "Finance" : "Member");

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email ?? "");
    setEditBranchId(m.branchId ?? "");
    setEditStatus(m.status ?? "active");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditBranchId("");
    setEditStatus("active");
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
        <form onSubmit={handleSubmit} className="card space-y-4 p-4 sm:p-6">
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
              placeholder="user@example.com"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Default password: P@ssw0rd</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Role</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as "member" | "admin" | "finance")}
              className="input"
            >
              <option value="member">Member</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formRole === "member" && (
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
          )}
          <button type="submit" className="btn-primary">
            Add Member
          </button>
        </form>
      )}

      {isAdmin && needingAccountsCount > 0 && (
        <div className="card flex flex-col gap-4 border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="overflow-x-auto -mx-px">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                  Email
                </th>
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Branch
                </th>
                {isAdmin && (
                  <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                    Role
                  </th>
                )}
                <th className="cell text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="cell text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-20 sm:w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filterByBranch.map((m) => (
                <tr key={m.id} className="transition hover:bg-white/5">
                  {editingId === m.id ? (
                    <>
                      <td className="cell" colSpan={isAdmin ? 6 : 5}>
                        <form
                          onSubmit={handleSaveEdit}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div className="w-full min-w-0 sm:w-auto">
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input w-full sm:w-40"
                              required
                            />
                          </div>
                          <div className="w-full min-w-0 sm:w-auto">
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Email
                            </label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="input w-full sm:w-48"
                              required
                            />
                          </div>
                          {isAdmin && (
                            <>
                              <div className="w-full min-w-0 sm:w-auto">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  Branch
                                </label>
                                <select
                                  value={editBranchId}
                                  onChange={(e) => setEditBranchId(e.target.value)}
                                  className="input w-full sm:w-40"
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
                            </>
                          )}
                          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
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
                      <td className="cell font-medium text-slate-200">{m.name}</td>
                      <td className="cell text-slate-400 hidden sm:table-cell">{m.email || "—"}</td>
                      <td className="cell text-slate-400">{m.branchId ? branchName(m.branchId) : "—"}</td>
                      {isAdmin && (
                        <td className="cell text-slate-400 hidden sm:table-cell">{roleLabel(m.role)}</td>
                      )}
                      <td className="cell">
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
                      <td className="cell text-right w-20 sm:w-24">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="btn-secondary text-sm py-1.5 px-3"
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
          <div className="cell py-12 text-center text-slate-500">
            No members in this filter. Add members to get started.
          </div>
        )}
      </div>
    </div>
  );
}
