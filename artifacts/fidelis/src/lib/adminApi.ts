const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function getToken(): Promise<string | null> {
  // @ts-ignore
  const t = await window.Clerk?.session?.getToken?.();
  return t ?? null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const adminApi = {
  check: () => request<{ isAdmin: boolean }>("/api/admin/check"),
  overview: () => request<AdminOverview>("/api/admin/overview"),
  users: () => request<AdminUserSummary[]>("/api/admin/users"),
  user: (userId: string) =>
    request<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`),
  updateUser: (userId: string, body: Partial<{ displayName: string; email: string; isAdmin: boolean; isSuspended: boolean }>) =>
    request<{ ok: true }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  setCash: (userId: string, cashBalance: number, note?: string) =>
    request<{ ok: true; oldBalance: number; newBalance: number; delta: number }>(
      `/api/admin/users/${encodeURIComponent(userId)}/cash`,
      { method: "PATCH", body: JSON.stringify({ cashBalance, note }) },
    ),
  upsertHolding: (userId: string, body: { symbol: string; quantity: number; averageCost: number }) =>
    request<{ ok: true }>(`/api/admin/users/${encodeURIComponent(userId)}/holdings`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteHolding: (userId: string, symbol: string) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/holdings/${encodeURIComponent(symbol)}`,
      { method: "DELETE" },
    ),
  deleteUser: (userId: string) =>
    request<{ ok: true }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  orders: () => request<AdminOrderRow[]>("/api/admin/orders"),
  transactions: () => request<AdminTransactionRow[]>("/api/admin/transactions"),
  syncMe: (body: { email?: string; displayName?: string }) =>
    request<{ ok: true }>(`/api/account/sync`, {
      method: "POST",
      body: JSON.stringify(body),
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
  topHoldings: { symbol: string; name: string; totalValue: number }[];
}

export interface AdminUserSummary {
  userId: string;
  displayName: string;
  email: string | null;
  cashBalance: number;
  portfolioValue: number;
  totalEquity: number;
  positionCount: number;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface AdminUserDetail {
  account: {
    userId: string;
    displayName: string;
    email: string | null;
    cashBalance: number;
    portfolioValue: number;
    totalEquity: number;
    isAdmin: boolean;
    isSuspended: boolean;
    createdAt: string;
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
