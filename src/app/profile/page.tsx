"use client";

import { useEffect, useState } from "react";

type Profile = {
  role: string;
  id: string;
  email: string;
  name?: string;
  branchName?: string;
  status?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editEmail, setEditEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setChanging(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "success", text: data.message ?? "Password updated." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed to update password." });
      }
    } finally {
      setChanging(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    const trimmed = editEmail.trim();
    if (!trimmed) {
      setEmailMessage({ type: "error", text: "Enter a new email address." });
      return;
    }
    if (!emailPassword) {
      setEmailMessage({ type: "error", text: "Current password is required." });
      return;
    }
    setChangingEmail(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, currentPassword: emailPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailMessage({ type: "success", text: data.message ?? "Email updated." });
        setEditEmail("");
        setEmailPassword("");
        fetch("/api/auth/profile")
          .then((r) => (r.ok ? r.json() : null))
          .then(setProfile);
      } else {
        setEmailMessage({ type: "error", text: data.error ?? "Failed to update email." });
      }
    } finally {
      setChangingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
        <p className="font-medium">Not signed in</p>
        <a href="/login" className="mt-2 inline-block text-primary-400 hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="heading text-2xl">My profile</h1>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-100">Account details</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-slate-500">Role</dt>
            <dd className="text-slate-200">{profile.role === "admin" ? "Admin" : "Member"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="text-slate-200">{profile.email}</dd>
          </div>
          {profile.name != null && profile.name !== "" && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Name</dt>
              <dd className="text-slate-200">{profile.name}</dd>
            </div>
          )}
          {profile.branchName != null && profile.branchName !== "" && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Branch</dt>
              <dd className="text-slate-200">{profile.branchName}</dd>
            </div>
          )}
          {profile.status != null && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Status</dt>
              <dd className="text-slate-200 capitalize">{profile.status}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-100">Change email</h2>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">New email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="input"
              placeholder={profile.email}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              Current password
            </label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {emailMessage && (
            <p
              className={`text-sm ${
                emailMessage.type === "success" ? "text-primary-400" : "text-red-400"
              }`}
            >
              {emailMessage.text}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={changingEmail}
          >
            {changingEmail ? "Updating…" : "Update email"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-100">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-primary-400" : "text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={changing}
          >
            {changing ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
