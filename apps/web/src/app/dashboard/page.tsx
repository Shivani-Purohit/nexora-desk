"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getOrg, getToken } from "../../lib/api";
import AppShell from "../../components/app-shell";
import {
  StatusBadge,
  PriorityBadge,
  SourceBadge,
  fullName,
} from "../../components/badges";

export default function DashboardPage() {
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    urgent: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const o = getOrg();
    if (!o?.id) {
      setError("No workspace found. Please sign in again.");
      setLoading(false);
      return;
    }
    setOrg(o);
    load(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(o: any) {
    try {
      const [tickets, orgData] = await Promise.all([
        api(`/organizations/${o.id}/tickets?limit=100`),
        api(`/organizations/${o.id}`),
      ]);
      const items: any[] = tickets.items ?? [];
      const done = (t: any) => t.status === "RESOLVED" || t.status === "CLOSED";
      setStats({
        total: tickets.pagination?.total ?? items.length,
        open: items.filter((t) => t.status === "OPEN").length,
        inProgress: items.filter((t) => t.status === "IN_PROGRESS").length,
        pending: items.filter((t) => t.status === "PENDING_CUSTOMER").length,
        resolved: items.filter(done).length,
        urgent: items.filter((t) => t.priority === "URGENT" && !done(t)).length,
      });
      setRecent(items.slice(0, 6));
      setOrgName(orgData.name ?? o.name ?? "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { label: "Total tickets", value: stats.total, accent: "bg-slate-500" },
    { label: "Open", value: stats.open, accent: "bg-blue-500" },
    { label: "In progress", value: stats.inProgress, accent: "bg-amber-500" },
    { label: "Pending customer", value: stats.pending, accent: "bg-purple-500" },
    { label: "Resolved / closed", value: stats.resolved, accent: "bg-green-500" },
    { label: "Urgent (active)", value: stats.urgent, accent: "bg-red-500" },
  ];

  return (
    <AppShell active="dashboard">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {orgName || "Workspace"} — Overview
          </h1>
          <p className="text-sm text-slate-500">
            Live snapshot of your support queue
          </p>
        </div>
        <a
          href={org?.id ? `/organizations/${org.id}/tickets?new=1` : "#"}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + New ticket
        </a>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className={`h-1 ${c.accent}`} />
            <div className="p-4">
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "…" : c.value}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent tickets</h2>
          <a
            href={org?.id ? `/organizations/${org.id}/tickets` : "#"}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View all →
          </a>
        </div>
        {recent.length === 0 && !loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No tickets yet. Click “+ New ticket” to create the first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-500">#{t.number}</td>
                  <td className="px-5 py-3">
                    <a
                      href={`/organizations/${org?.id}/tickets/${t.number}`}
                      className="font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {t.subject}
                    </a>
                  </td>
                  <td className="px-5 py-3"><StatusBadge value={t.status} /></td>
                  <td className="px-5 py-3"><PriorityBadge value={t.priority} /></td>
                  <td className="px-5 py-3"><SourceBadge value={t.source} /></td>
                  <td className="px-5 py-3 text-slate-600">{fullName(t.assignedTo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}