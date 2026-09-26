"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getOrg, getToken } from "../../../../lib/api";
import AppShell from "../../../../components/app-shell";
import {
  StatusBadge,
  PriorityBadge,
  SourceBadge,
  fullName,
} from "../../../../components/badges";

const STATUSES = ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const SOURCES = ["MANUAL", "EMAIL", "WEB", "WHATSAPP", "TELEGRAM"];
const CATEGORIES = [
  "GENERAL",
  "NEW_CONFIGURATION",
  "TROUBLESHOOTING",
  "SUBSCRIPTION",
  "RMA",
  "FEATURE_REQUEST",
];

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none";

export default function TicketsPage() {
  const router = useRouter();
  const org = getOrg();

  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "NORMAL",
    source: "MANUAL",
    category: "GENERAL",
    assignedToId: "",
  });

  const load = useCallback(
    async (page = 1) => {
      if (!org?.id) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (status) params.set("status", status);
        if (priority) params.set("priority", priority);
        if (source) params.set("source", source);
        if (category) params.set("category", category);
        if (search) params.set("search", search);
        const data = await api(`/organizations/${org.id}/tickets?${params}`);
        setItems(data.items ?? []);
        setPagination(data.pagination ?? { page: 1, totalPages: 1, total: 0 });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [org?.id, status, priority, source, category, search]
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (typeof window !== "undefined" && window.location.search.includes("new=1")) {
      setShowNew(true);
    }
    load(1);
    if (org?.id) {
      api(`/organizations/${org.id}/members`)
        .then((members: any[]) =>
          setAgents(
            (members ?? [])
              .filter((m) => ["OWNER", "ADMIN", "AGENT"].includes(m.role))
              .map((m) => m.user)
          )
        )
        .catch(() => setAgents([]));
    }
  }, [load, org?.id, router]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const body: any = { ...form };
      if (!body.assignedToId) delete body.assignedToId;
      if (!body.description) delete body.description;
      await api(`/organizations/${org.id}/tickets`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setShowNew(false);
      setForm({
        subject: "",
        description: "",
        priority: "NORMAL",
        source: "MANUAL",
        category: "GENERAL",
        assignedToId: "",
      });
      load(1);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell active="tickets">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">
            {pagination.total} ticket{pagination.total === 1 ? "" : "s"} in this workspace
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + New ticket
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === s
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-300" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
          <option value="">Priority: any</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls}>
          <option value="">Source: any</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="">Category: any</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="ml-auto flex gap-2"
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tickets…"
            className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-slate-400">Loading tickets…</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">
            No tickets match. Try clearing filters or create a new ticket.
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
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-500">#{t.number}</td>
                  <td className="px-5 py-3">
                    <a
                      href={`/organizations/${org?.id}/tickets/${t.number}`}
                      className="font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {t.subject}
                    </a>
                    {t.customer && (
                      <div className="text-xs text-slate-400">
                        {fullName(t.customer)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusBadge value={t.status} /></td>
                  <td className="px-5 py-3"><PriorityBadge value={t.priority} /></td>
                  <td className="px-5 py-3"><SourceBadge value={t.source} /></td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {t.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{fullName(t.assignedTo)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <button
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* New ticket modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">New ticket</h2>
            {createError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}
            <form onSubmit={createTicket} className="space-y-3">
              <input
                required
                minLength={3}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Subject (min 3 characters)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className={selectCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={selectCls}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={selectCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <select
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                className={`w-full ${selectCls}`}
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{fullName(a)}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}