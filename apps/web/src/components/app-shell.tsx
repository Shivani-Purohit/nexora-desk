"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getOrg, getUser } from "../lib/api";
import Logo from "./logo";

export default function AppShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const user = ready ? getUser() : null;
  const org = ready ? getOrg() : null;

  const links = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    {
      key: "tickets",
      label: "Tickets",
      href: org?.id ? `/organizations/${org.id}/tickets` : "/dashboard",
    },
    {
      key: "team",
      label: "Team",
      href: org?.id ? `/organizations/${org.id}/team` : "/dashboard",
    },
  ];

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-60 flex-col bg-slate-900 text-slate-300">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active === l.key
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="mb-1 truncate font-semibold text-slate-300">
            {org?.name ?? "Workspace"}
          </div>
          <div className="truncate text-slate-500">{user?.email ?? ""}</div>
          <div className="mt-1 capitalize text-slate-500">
            {user?.memberships?.[0]?.role?.toLowerCase() ?? "member"}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-6">
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}