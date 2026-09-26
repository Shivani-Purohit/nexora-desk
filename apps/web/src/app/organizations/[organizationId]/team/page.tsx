"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getOrg, getToken } from "../../../../lib/api";
import AppShell from "../../../../components/app-shell";
import { fullName } from "../../../../components/badges";

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-indigo-100 text-indigo-700",
  ADMIN: "bg-purple-100 text-purple-700",
  AGENT: "bg-blue-100 text-blue-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[role] ?? "bg-slate-100 text-slate-600"}`}
    >
      {role}
    </span>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const org = getOrg();

  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("AGENT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  async function load() {
    if (!org?.id) return;
    try {
      const [m, inv] = await Promise.all([
        api(`/organizations/${org.id}/members`),
        api(`/organizations/${org.id}/invitations`),
      ]);
      setMembers(m ?? []);
      setInvitations(inv ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg("");
    try {
      await api(`/organizations/${org.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setInviteMsg(`Invitation sent to ${email}! Check Mailpit (localhost:8025) for the email.`);
      setEmail("");
      await load();
    } catch (e: any) {
      setInviteMsg("Error: " + e.message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <AppShell active="team">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Team</h1>
      <p className="mb-6 text-sm text-slate-500">
        Members and invitations for {org?.name ?? "your workspace"}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-500">
            Members ({members.length})
          </h2>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {fullName(m.user)}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{m.user.email}</td>
                    <td className="py-3 pr-4"><RoleBadge role={m.role} /></td>
                    <td className="py-3 text-xs text-slate-500">
                      {m.user.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Invite a teammate</h2>
            {inviteMsg && (
              <div className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                {inviteMsg}
              </div>
            )}
            <form onSubmit={invite} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {inviting ? "Sending…" : "Send invitation"}
              </button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              Pending invitations
            </h2>
            {invitations.length === 0 ? (
              <p className="text-sm text-slate-400">No invitations yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-slate-700">{inv.email}</div>
                      <div className="text-xs text-slate-400">
                        expires {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <RoleBadge role={inv.role} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
              💌 Invitation emails are captured by Mailpit → open{" "}
              <a href="http://localhost:8025" target="_blank" className="text-indigo-600 underline">
                localhost:8025
              </a>
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}