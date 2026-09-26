"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession } from "../../lib/api";
import Logo from "../../components/logo";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organizationName: "",
    organizationSlug: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({
      ...f,
      [field]: value,
      ...(field === "organizationName" ? { organizationSlug: slugify(value) } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      saveSession(res.accessToken, res.user);
      try {
        const me = await api("/auth/me");
        saveSession(res.accessToken, me.user ?? me);
      } catch {
        // register response is enough
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-1 mb-6 text-center text-sm text-slate-500">
          Set up your organization&apos;s ticketing desk in seconds
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
              <input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputCls} placeholder="Priya" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
              <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputCls} placeholder="Sharma" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputCls} placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className={inputCls} placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Organization name</label>
            <input required value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} className={inputCls} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Workspace slug</label>
            <input required value={form.organizationSlug} onChange={(e) => update("organizationSlug", slugify(e.target.value))} className={inputCls} placeholder="acme-corp" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}