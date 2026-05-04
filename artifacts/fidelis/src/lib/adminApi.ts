const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export class PinRequiredError extends Error {
  constructor() {
    super("PIN_DISABLED");
    this.name = "PinRequiredError";
  }
}

async function waitForClerk() {
  const clerk = (window as any).Clerk;

  if (!clerk) return null;

  if (typeof clerk.load === "function") {
    await clerk.load();
  }

  return clerk;
}

async function getClerkAuth(): Promise<{
  userId: string | null;
  token: string | null;
}> {
  const clerk = await waitForClerk();

  if (!clerk) {
    console.warn("Clerk not loaded yet.");
    return { userId: null, token: null };
  }

  const session = clerk.session;

  if (!session) {
    console.warn("No Clerk session found.");
    return { userId: null, token: null };
  }

  const token = await session.getToken();

  const userId =
    session.user?.id ||
    clerk.user?.id ||
    clerk.client?.sessions?.[0]?.user?.id ||
    null;

  return { userId, token };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { userId, token } = await getClerkAuth();

  if (!userId || !token) {
    throw new Error("Unauthorized: missing Clerk session token");
  }

  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;

    try {
      const body = await res.json();
      message = body?.error || body?.details || message;
    } catch {}

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

export const adminPinSession = {
  get() {
    return null;
  },
  set(_token: string) {},
  clear() {},
};

export const adminApi = {
  syncMe: () =>
    request("/api/account/sync", {
      method: "POST",
    }),

  dashboard: () => request<any>("/api/account/dashboard"),

  me: () => request<any>("/api/account/me"),

  check: () => request<{ isAdmin: boolean }>("/api/admin/check"),

  verifyPin: async (_pin: string) => {
    return { ok: true, token: "" };
  },

  overview: () => request<any>("/api/admin/overview"),

  users: () => request<any[]>("/api/admin/users"),

  user: (userId: string) =>
    request<any>(`/api/admin/users/${encodeURIComponent(userId)}`),

  updateUser: (userId: string, body: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateCash: (userId: string, body: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/cash`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateOverrides: (userId: string, body: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/overrides`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  upsertHolding: (userId: string, body: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/holdings`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteHolding: (userId: string, symbol: string) =>
    request(
      `/api/admin/users/${encodeURIComponent(
        userId,
      )}/holdings/${encodeURIComponent(symbol)}`,
      {
        method: "DELETE",
      },
    ),

  createTransaction: (userId: string, data: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request(`/api/admin/transactions/${id}`, {
      method: "DELETE",
    }),

  deleteUser: (userId: string) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  uploadAvatar: (formData: FormData) =>
    request("/api/account/avatar", {
      method: "POST",
      body: formData,
    }),

  transactions: () => request<any[]>("/api/admin/transactions"),

  orders: () => request<any[]>("/api/admin/orders"),
};