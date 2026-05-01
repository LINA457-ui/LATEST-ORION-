const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:1805";

const PIN_TOKEN_KEY = "orion_admin_pin_token";

export const adminPinSession = {
  get(): string | null {
    try {
      return (
        sessionStorage.getItem(PIN_TOKEN_KEY) ||
        localStorage.getItem("admin_pin_token")
      );
    } catch {
      return null;
    }
  },

  set(token: string) {
    try {
      sessionStorage.setItem(PIN_TOKEN_KEY, token);
      localStorage.setItem("admin_pin_token", token);
    } catch {}
  },

  clear() {
    try {
      sessionStorage.removeItem(PIN_TOKEN_KEY);
      localStorage.removeItem("admin_pin_token");
    } catch {}
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

async function request<T = any>(
  path: string,
  init: RequestOpts = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };

  if (init.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (init.withPin !== false) {
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
    } catch {}

    if (body.code === "PIN_REQUIRED") {
      adminPinSession.clear();
      throw new PinRequiredError();
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;

    try {
      const body = await res.clone().json();
      message = body?.error || body?.message || message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
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
    request("/api/account/sync", {
      method: "POST",
      withPin: false,
    }),

  check: () =>
    request<{ isAdmin: boolean }>("/api/admin/check", {
      withPin: false,
    }),

  verifyPin: async (pin: string) => {
    const res = await request<{ ok: boolean; token: string }>(
      "/api/admin/pin/verify",
      {
        method: "POST",
        body: JSON.stringify({ pin }),
        withPin: false,
      }
    );

    adminPinSession.set(res.token);
    return res;
  },

  users: () => request<any[]>("/api/admin/users"),

  user: (userId: string) =>
    request<any>(`/api/admin/users/${encodeURIComponent(userId)}`),

  updateUser: (userId: string, body: any) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateCash: (
    userId: string,
    body: { cashBalance: number; note?: string }
  ) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/cash`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateOverrides: (
    userId: string,
    body: {
      equity?: number | null;
      marketValue?: number | null;
      buyingPower?: number | null;
      dayChange?: number | null;
      dayChangePercent?: number | null;
    }
  ) =>
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
        userId
      )}/holdings/${encodeURIComponent(symbol)}`,
      {
        method: "DELETE",
      }
    ),

  createTransaction: (
    userId: string,
    data: {
      type: string;
      description: string;
      amount: number;
      symbol?: string | null;
      createdAt?: string;
    }
  ) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request(`/api/admin/transactions/${id}`, {
      method: "DELETE",
    }),

  transactions: () => request<any[]>("/api/admin/transactions"),

  orders: () => request<any[]>("/api/admin/orders"),

  deleteUser: (userId: string) =>
    request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
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