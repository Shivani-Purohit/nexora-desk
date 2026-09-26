const TOKEN_KEY = "nexora_token";
const USER_KEY = "nexora_user";
const ORG_KEY = "nexora_org";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getOrg(): any {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  const org = user?.memberships?.[0]?.organization;
  if (org) localStorage.setItem(ORG_KEY, JSON.stringify(org));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
}

export async function api(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as object) },
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || res.statusText;
    throw new Error(msg || "Request failed");
  }

  return data;
}