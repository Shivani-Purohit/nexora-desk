const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const SOURCE_STYLES: Record<string, string> = {
  MANUAL: "bg-slate-100 text-slate-600",
  EMAIL: "bg-cyan-100 text-cyan-700",
  WEB: "bg-indigo-100 text-indigo-700",
  WHATSAPP: "bg-green-100 text-green-700",
  TELEGRAM: "bg-sky-100 text-sky-700",
};

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[value] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export const StatusBadge = ({ value }: { value: string }) => (
  <Badge value={value} styles={STATUS_STYLES} />
);
export const PriorityBadge = ({ value }: { value: string }) => (
  <Badge value={value} styles={PRIORITY_STYLES} />
);
export const SourceBadge = ({ value }: { value: string }) => (
  <Badge value={value} styles={SOURCE_STYLES} />
);

export function fullName(u: any): string {
  if (!u) return "—";
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—";
}