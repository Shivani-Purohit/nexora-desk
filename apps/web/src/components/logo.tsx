export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-xl bg-indigo-600 font-bold text-white ${
          size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg"
        }`}
      >
        N
      </div>
      <span
        className={`font-bold tracking-tight text-slate-900 ${
          size === "sm" ? "text-base" : "text-xl"
        }`}
      >
        Nexora<span className="text-indigo-600">Desk</span>
      </span>
    </div>
  );
}