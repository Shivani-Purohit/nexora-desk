"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getOrg, getToken } from "../../../../../lib/api";
import AppShell from "../../../../../components/app-shell";
import {
  StatusBadge,
  PriorityBadge,
  SourceBadge,
  fullName,
} from "../../../../../components/badges";
import TicketTimeline from "../../../../../components/ticket-timeline";

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
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const org = getOrg();
  const number = Number(params.ticketNumber);

  const [ticket, setTicket] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState("");

  async function load() {
    try {
      const [t, tl] = await Promise.all([
        api(`/organizations/${org.id}/tickets/${number}`),
        api(`/organizations/${org.id}/tickets/${number}/timeline`),
      ]);
      setTicket(t);
      setTimeline(tl ?? []);
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
    if (!org?.id || !number) return;
    load();
    api(`/organizations/${org.id}/members`)
      .then((members: any[]) =>
        setAgents(
          (members ?? [])
            .filter((m) => ["OWNER", "ADMIN", "AGENT"].includes(m.role))
            .map((m) => m.user)
        )
      )
      .catch(() => setAgents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, org?.id]);

  async function updateField(field: string, value: any) {
    setSaved("");
    try {
      await api(`/organizations/${org.id}/tickets/${number}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      setSaved("Saved ✓");
      await load();
      setTimeout(() => setSaved(""), 2000);
    } catch (e: any) {
      setSaved("Error: " + e.message);
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      await api(`/tickets/${ticket.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: comment, isInternal }),
      });
      setComment("");
      setIsInternal(false);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <AppShell active="tickets">
        <div className="py-20 text-center text-sm text-slate-400">
          Loading ticket…
        </div>
      </AppShell>
    );
  }

  if (error || !ticket) {
    return (
      <AppShell active="tickets">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Ticket not found"}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="tickets">
      <a
        href={`/organizations/${org?.id}/tickets`}
        className="text-sm text-slate-500 hover:text-indigo-600"
      >
        ← Back to tickets
      </a>

      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold text-slate-400">
          #{ticket.number}
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
        <StatusBadge value={ticket.status} />
        <span className="ml-auto text-xs text-slate-400">{saved}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: conversation */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-500">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {ticket.description || "No description provided."}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-500">
              Conversation & activity
            </h2>
            <TicketTimeline items={timeline} />
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              Add reply
            </h2>
            <form onSubmit={sendComment}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Write a reply…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Internal note (not visible to customer)
                </label>
                <button
                  type="submit"
                  disabled={sending || !comment.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Post reply"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: properties */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-500">
              Properties
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className={selectCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className={selectCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Source</label>
                <select
                  value={ticket.source}
                  onChange={(e) => updateField("source", e.target.value)}
                  className={selectCls}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                <select
                  value={ticket.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className={selectCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Assignee</label>
                <select
                  value={ticket.assignedTo?.id ?? ""}
                  onChange={(e) =>
                    updateField("assignedToId", e.target.value || null)
                  }
                  className={selectCls}
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{fullName(a)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created by</dt>
                <dd className="font-medium text-slate-800">{fullName(ticket.createdBy)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">
                  {new Date(ticket.createdAt).toLocaleString("en-IN")}
                </dd>
              </div>
              {ticket.customer && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Customer</dt>
                  <dd className="text-slate-700">{fullName(ticket.customer)}</dd>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Resolved</dt>
                  <dd className="text-slate-700">
                    {new Date(ticket.resolvedAt).toLocaleString("en-IN")}
                  </dd>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Closed</dt>
                  <dd className="text-slate-700">
                    {new Date(ticket.closedAt).toLocaleString("en-IN")}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <SourceBadge value={ticket.source} />
              <PriorityBadge value={ticket.priority} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}