const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:1805";

const PIN_TOKEN_KEY = "orion_admin_pin_token";

export const adminPinSession = {
  get(): string | null {
    try {
      return sessionStorage.getItem(PIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set(token: string) {
    try {
      sessionStorage.setItem(PIN_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(PIN_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

export class PinRequiredError extends Error {
  constructor() {
    super("PIN_REQUIRED");
    this.name = "PinRequiredError";
  }
}

async function getToken(): Promise<string | null> {
  const clerk = (window as any).Clerk;
  const token = await clerk?.session?.getToken?.();
  return token ?? null;
}

interface RequestOpts extends RequestInit {
  withPin?: boolean;
}

async function request<T>(path: string, init?: RequestOpts): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (init?.withPin !== false) {
    const pinToken = adminPinSession.get();

    if (pinToken) {
      headers["X-Admin-Pin"] = pinToken;
      headers["x-admin-pin-token"] = pinToken;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    let body: { code?: string } = {};

    try {
      body = await res.clone().json();
    } catch {
      // ignore
    }

    if (body.code === "PIN_REQUIRED") {
      adminPinSession.clear();
      throw new PinRequiredError();
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;

    try {
      const body = await res.clone().json();
      message = body?.error || message;
    } catch {
      const text = await res.text().catch(() => "");

      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const adminApi = {
  syncMe: () =>
    request<{ ok: true }>("/api/account/sync", {
      method: "POST",
      withPin: false,
    }),

  uploadAvatar: (avatarUrl: string | null) =>
    request<{ ok: true; avatarUrl: string | null }>("/api/account/avatar", {
      method: "POST",
      body: JSON.stringify({ avatarUrl }),
      withPin: false,
    }),

  check: () =>
    request<{ isAdmin: boolean }>("/api/admin/check", {
      withPin: false,
    }),

  verifyPin: (pin: string) =>
    request<{ ok: true; token: string }>("/api/admin/pin/verify", {
      method: "POST",
      body: JSON.stringify({ pin }),
      withPin: false,
    }),

  listPins: () => request<AdminPinRow[]>("/api/admin/pins"),

  createPin: (pin: string, label?: string) =>
    request<{ ok: true; id: number }>("/api/admin/pins", {
      method: "POST",
      body: JSON.stringify({ pin, label }),
    }),

  updatePin: (id: number, body: { pin?: string; label?: string }) =>
    request<{ ok: true }>(`/api/admin/pins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deletePin: (id: number) =>
    request<{ ok: true }>(`/api/admin/pins/${id}`, {
      method: "DELETE",
    }),

  overview: () => request<AdminOverview>("/api/admin/overview"),

  users: () => request<AdminUserSummary[]>("/api/admin/users"),

  user: (userId: string) =>
    request<AdminUserDetail>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
    ),

  updateUser: (
    userId: string,
    body: {
      displayName?: string;
      email?: string;
      avatarUrl?: string;
      isAdmin?: boolean;
      isSuspended?: boolean;
    },
  ) =>
    request<{ ok: true }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateCash: (
    userId: string,
    body: {
      cashBalance: number;
      note?: string;
    },
  ) =>
    request<{
      ok: true;
      oldBalance: number;
      newBalance: number;
      delta: number;
    }>(`/api/admin/users/${encodeURIComponent(userId)}/cash`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setCash: (userId: string, cashBalance: number, note?: string) =>
    request<{
      ok: true;
      oldBalance: number;
      newBalance: number;
      delta: number;
    }>(`/api/admin/users/${encodeURIComponent(userId)}/cash`, {
      method: "PATCH",
      body: JSON.stringify({ cashBalance, note }),
    }),

  updateOverrides: (
    userId: string,
    body: {
      equity?: number | null;
      marketValue?: number | null;
      buyingPower?: number | null;
      dayChange?: number | null;
      dayChangePercent?: number | null;
    },
  ) => {
    console.log("🔥 CALLING updateOverrides API", userId, body);

    return request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/overrides`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },

  setOverrides: (
    userId: string,
    body: Partial<{
      equity: number | null;
      marketValue: number | null;
      buyingPower: number | null;
      dayChange: number | null;
      dayChangePercent: number | null;
    }>,
  ) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/overrides`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    ),

  upsertHolding: (
    userId: string,
    body: {
      symbol: string;
      quantity: number;
      averageCost: number;
    },
  ) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/holdings`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),

  deleteHolding: (userId: string, symbol: string) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/holdings/${encodeURIComponent(
        symbol,
      )}`,
      {
        method: "DELETE",
      },
    ),

  createTransaction: (
    userId: string,
    body: {
      type: string;
      description: string;
      amount: number;
      symbol?: string | null;
      createdAt?: string;
    },
  ) =>
    request<{
      ok: true;
      transaction: AdminUserDetail["recentTransactions"][number];
    }>(
      `/api/admin/users/${encodeURIComponent(userId)}/transactions`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),

  updateTransaction: (
    id: number,
    body: Partial<{
      type: string;
      description: string;
      amount: number;
      symbol: string | null;
      createdAt: string;
    }>,
  ) =>
    request<{ ok: true }>(`/api/admin/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTransaction: (id: number) =>
    request<{ ok: true }>(`/api/admin/transactions/${id}`, {
      method: "DELETE",
    }),

  deleteUser: (userId: string) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      },
    ),

  orders: () => request<AdminOrderRow[]>("/api/admin/orders"),

  transactions: () =>
    request<AdminTransactionRow[]>("/api/admin/transactions"),
};

export interface AdminOverview {
  totalUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  totalCash: number;
  totalPortfolioValue: number;
  totalAum: number;
  totalOrders: number;
  totalVolume: number;
  signupsToday: number;
  signupsThisWeek: number;
  topHoldings: {
    symbol: string;
    name: string;
    totalValue: number;
  }[];
}

export interface AdminPinRow {
  id: number;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminUserSummary {
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  cashBalance: number;
  portfolioValue: number;
  totalEquity: number;
  positionCount: number;
  isAdmin: boolean;
  isSuspended: boolean;
  hasOverrides: boolean;
  createdAt: string;
}

export interface AdminUserDetail {
  account: {
    userId: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    cashBalance: number;
    portfolioValue: number;
    totalEquity: number;
    isAdmin: boolean;
    isSuspended: boolean;
    createdAt: string;
    displayedTotalEquity: number;
    displayedPortfolioValue: number;
    displayedBuyingPower: number;
    displayedDayChange: number | null;
    displayedDayChangePercent: number | null;
    overrides: {
      equity: number | null;
      marketValue: number | null;
      buyingPower: number | null;
      dayChange: number | null;
      dayChangePercent: number | null;
    };
  };

  positions: {
    id: number;
    symbol: string;
    name: string;
    quantity: number;
    averageCost: number;
    currentPrice: number;
    marketValue: number;
  }[];

  recentOrders: {
    id: number;
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    price: number;
    total: number;
    status: string;
    createdAt: string;
  }[];

  recentTransactions: {
    id: number;
    type: string;
    description: string;
    amount: number;
    symbol?: string;
    createdAt: string;
  }[];
}

export interface AdminOrderRow {
  id: number;
  userId: string;
  userName: string;
  userEmail: string | null;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface AdminTransactionRow {
  id: number;
  userId: string;
  userName: string;
  userEmail: string | null;
  type: string;
  description: string;
  amount: number;
  symbol?: string;
  createdAt: string;
}