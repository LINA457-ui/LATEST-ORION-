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

async function getClerkToken(): Promise<string | null> {
  const clerk = await waitForClerk();

  if (!clerk?.session) {
    console.warn("No Clerk session found.");
    return null;
  }

  return await clerk.session.getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const clerkToken = await getClerkToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
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
      `/api/admin/users/${encodeURIComponent(userId)}/holdings/${encodeURIComponent(
        symbol
      )}`,
      {
        method: "DELETE",
      }
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
    fetch(`${BASE}/api/account/avatar`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to upload avatar");
      }

      return res.json();
    }),

  transactions: () => request<any[]>("/api/admin/transactions"),

  orders: () => request<any[]>("/api/admin/orders"),
};