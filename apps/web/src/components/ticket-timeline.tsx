import { StatusBadge, fullName } from "./badges";

const DOTS: Record<string, string> = {
  COMMENT_ADDED: "bg-indigo-500",
  STATUS_CHANGED: "bg-amber-500",
  PRIORITY_CHANGED: "bg-orange-500",
  ASSIGNMENT_CHANGED: "bg-blue-500",
  CATEGORY_CHANGED: "bg-purple-500",
  ATTACHMENT_ADDED: "bg-cyan-500",
  SLA_BREACHED: "bg-red-500",
  SYSTEM_LOG: "bg-slate-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describe(a: any) {
  const md = a.metadata ?? {};
  switch (a.type) {
    case "SYSTEM_LOG":
      return md.action === "TICKET_CREATED" ? "Ticket created" : "System event";
    case "STATUS_CHANGED":
      return (
        <span className="flex flex-wrap items-center gap-1">
          Status changed: <StatusBadge value={md.from} /> → <StatusBadge value={md.to} />
        </span>
      );
    case "PRIORITY_CHANGED":
      return `Priority changed: ${md.from} → ${md.to}`;
    case "ASSIGNMENT_CHANGED":
      return md.to ? "Ticket assigned" : "Ticket unassigned";
    case "CATEGORY_CHANGED":
      return `Category changed: ${md.from} → ${md.to}`;
    case "ATTACHMENT_ADDED":
      return `Attachment added: ${md.fileName ?? "file"}`;
    case "SLA_BREACHED":
      return "SLA breached";
    default:
      return a.type;
  }
}

export default function TicketTimeline({ items }: { items: any[] }) {
  if (!items?.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative ml-2 space-y-5 border-l-2 border-slate-200 pl-6">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span
            className={`absolute top-1 -left-[31px] h-3 w-3 rounded-full ${
              DOTS[a.type] ?? "bg-slate-400"
            }`}
          />
          <div className="text-xs text-slate-400">
            {fmtTime(a.createdAt)} · {fullName(a.actor)}
          </div>
          {a.type === "COMMENT_ADDED" && a.comment ? (
            <div
              className={`mt-1 rounded-lg px-3 py-2 text-sm ${
                a.comment.isInternal
                  ? "border border-amber-200 bg-amber-50"
                  : "bg-slate-100"
              }`}
            >
              {a.comment.isInternal && (
                <div className="mb-1 text-xs font-semibold text-amber-700">
                  Internal note
                </div>
              )}
              <div className="whitespace-pre-wrap text-slate-800">
                {a.comment.message}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-700">{describe(a)}</div>
          )}
        </li>
      ))}
    </ol>
  );
}