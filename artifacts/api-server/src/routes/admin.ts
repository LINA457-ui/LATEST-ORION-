import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { accounts, holdings, orders, transactions } from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, userIdOf } from "../lib/auth";
import { getMeta, getQuote } from "../lib/marketData";

const router: IRouter = Router();
router.use(requireAuth);

// Public-to-admins check used by the frontend to gate the /admin nav link
router.get("/check", async (req, res: Response) => {
  const userId = userIdOf(req);
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  res.json({ isAdmin: !!account?.isAdmin });
});

// Everything below requires admin
router.use(requireAdmin);

router.get("/overview", async (_req, res: Response) => {
  const allAccounts = await db.select().from(accounts);
  const allHoldings = await db.select().from(holdings);
  const allOrders = await db.select().from(orders);

  let totalCash = 0;
  for (const a of allAccounts) totalCash += Number(a.cashBalance);

  let totalPortfolioValue = 0;
  const symbolValues: Record<string, number> = {};
  for (const h of allHoldings) {
    const q = getQuote(h.symbol);
    if (!q) continue;
    const v = Number(h.quantity) * q.price;
    totalPortfolioValue += v;
    symbolValues[h.symbol] = (symbolValues[h.symbol] ?? 0) + v;
  }

  let totalVolume = 0;
  for (const o of allOrders) totalVolume += Number(o.total);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const signupsToday = allAccounts.filter(
    (a) => now - a.createdAt.getTime() < dayMs,
  ).length;
  const signupsThisWeek = allAccounts.filter(
    (a) => now - a.createdAt.getTime() < 7 * dayMs,
  ).length;

  const topHoldings = Object.entries(symbolValues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([symbol, value]) => ({
      symbol,
      name: getMeta(symbol)?.name ?? symbol,
      totalValue: +value.toFixed(2),
    }));

  res.json({
    totalUsers: allAccounts.length,
    suspendedUsers: allAccounts.filter((a) => a.isSuspended).length,
    adminUsers: allAccounts.filter((a) => a.isAdmin).length,
    totalCash: +totalCash.toFixed(2),
    totalPortfolioValue: +totalPortfolioValue.toFixed(2),
    totalAum: +(totalCash + totalPortfolioValue).toFixed(2),
    totalOrders: allOrders.length,
    totalVolume: +totalVolume.toFixed(2),
    signupsToday,
    signupsThisWeek,
    topHoldings,
  });
});

router.get("/users", async (_req, res: Response) => {
  const allAccounts = await db
    .select()
    .from(accounts)
    .orderBy(desc(accounts.createdAt));

  const result = await Promise.all(
    allAccounts.map(async (a) => {
      const userHoldings = await db
        .select()
        .from(holdings)
        .where(eq(holdings.userId, a.userId));
      let portfolioValue = 0;
      for (const h of userHoldings) {
        const q = getQuote(h.symbol);
        if (q) portfolioValue += Number(h.quantity) * q.price;
      }
      const cash = Number(a.cashBalance);
      return {
        userId: a.userId,
        displayName: a.displayName,
        email: a.email,
        cashBalance: cash,
        portfolioValue: +portfolioValue.toFixed(2),
        totalEquity: +(cash + portfolioValue).toFixed(2),
        positionCount: userHoldings.length,
        isAdmin: a.isAdmin,
        isSuspended: a.isSuspended,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.get("/users/:userId", async (req, res: Response) => {
  const { userId } = req.params;
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (!account) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));
  let portfolioValue = 0;
  const positions = userHoldings.map((h) => {
    const q = getQuote(h.symbol);
    const meta = getMeta(h.symbol);
    const qty = Number(h.quantity);
    const price = q?.price ?? 0;
    const value = +(qty * price).toFixed(2);
    portfolioValue += value;
    return {
      id: h.id,
      symbol: h.symbol,
      name: meta?.name ?? h.symbol,
      quantity: qty,
      averageCost: Number(h.averageCost),
      currentPrice: price,
      marketValue: value,
    };
  });

  const recentOrders = (
    await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(20)
  ).map((o) => ({
    id: o.id,
    symbol: o.symbol,
    side: o.side as "buy" | "sell",
    quantity: Number(o.quantity),
    price: Number(o.price),
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  const recentTransactions = (
    await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(20)
  ).map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    symbol: t.symbol ?? undefined,
    createdAt: t.createdAt.toISOString(),
  }));

  const cash = Number(account.cashBalance);
  res.json({
    account: {
      userId: account.userId,
      displayName: account.displayName,
      email: account.email,
      cashBalance: cash,
      portfolioValue: +portfolioValue.toFixed(2),
      totalEquity: +(cash + portfolioValue).toFixed(2),
      isAdmin: account.isAdmin,
      isSuspended: account.isSuspended,
      createdAt: account.createdAt.toISOString(),
    },
    positions,
    recentOrders,
    recentTransactions,
  });
});

router.patch("/users/:userId", async (req, res: Response) => {
  const { userId } = req.params;
  const { displayName, isAdmin, isSuspended, email } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (typeof displayName === "string") updates.displayName = displayName;
  if (typeof email === "string") updates.email = email;
  if (typeof isAdmin === "boolean") updates.isAdmin = isAdmin;
  if (typeof isSuspended === "boolean") updates.isSuspended = isSuspended;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  // Prevent demoting the last remaining admin (would lock everyone out).
  if (updates.isAdmin === false) {
    const adminCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(eq(accounts.isAdmin, true));
    const totalAdmins = Number(adminCount[0]?.count ?? 0);
    const [target] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);
    if (target?.isAdmin && totalAdmins <= 1) {
      res.status(400).json({
        error: "Cannot demote the only remaining admin. Promote another user first.",
      });
      return;
    }
  }
  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.userId, userId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
});

router.patch("/users/:userId/cash", async (req, res: Response) => {
  const { userId } = req.params;
  const { cashBalance, note } = req.body ?? {};
  const newBalance = Number(cashBalance);
  if (!Number.isFinite(newBalance) || newBalance < 0) {
    res.status(400).json({ error: "Invalid cash balance" });
    return;
  }
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (!account) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const oldBalance = Number(account.cashBalance);
  const delta = +(newBalance - oldBalance).toFixed(2);

  // Atomic: cash update and audit transaction must succeed or fail together.
  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ cashBalance: newBalance.toFixed(2) })
      .where(eq(accounts.userId, userId));

    if (delta !== 0) {
      await tx.insert(transactions).values({
        userId,
        type: delta > 0 ? "deposit" : "fee",
        description:
          note && typeof note === "string" && note.trim().length > 0
            ? `Admin adjustment: ${note.trim()}`
            : "Admin balance adjustment",
        amount: delta.toFixed(2),
        symbol: null,
      });
    }
  });
  res.json({ ok: true, oldBalance, newBalance, delta });
});

router.post("/users/:userId/holdings", async (req, res: Response) => {
  const { userId } = req.params;
  const { symbol, quantity, averageCost } = req.body ?? {};
  if (typeof symbol !== "string" || symbol.trim().length === 0) {
    res.status(400).json({ error: "Symbol required" });
    return;
  }
  const upperSymbol = symbol.toUpperCase();
  const meta = getMeta(upperSymbol);
  if (!meta) {
    res.status(400).json({ error: "Unknown symbol" });
    return;
  }
  const qty = Number(quantity);
  const cost = Number(averageCost);
  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400).json({ error: "Invalid quantity" });
    return;
  }
  if (!Number.isFinite(cost) || cost < 0) {
    res.status(400).json({ error: "Invalid average cost" });
    return;
  }
  // Atomic upsert keyed on the (user_id, symbol) unique index.
  await db
    .insert(holdings)
    .values({
      userId,
      symbol: upperSymbol,
      quantity: qty.toFixed(6),
      averageCost: cost.toFixed(4),
    })
    .onConflictDoUpdate({
      target: [holdings.userId, holdings.symbol],
      set: {
        quantity: qty.toFixed(6),
        averageCost: cost.toFixed(4),
        updatedAt: new Date(),
      },
    });
  res.json({ ok: true });
});

router.delete("/users/:userId/holdings/:symbol", async (req, res: Response) => {
  const { userId, symbol } = req.params;
  await db
    .delete(holdings)
    .where(
      and(eq(holdings.userId, userId), eq(holdings.symbol, symbol.toUpperCase())),
    );
  res.json({ ok: true });
});

router.delete("/users/:userId", async (req, res: Response) => {
  const { userId } = req.params;
  // Don't allow deleting the only remaining admin.
  const [target] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.isAdmin) {
    const adminCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(eq(accounts.isAdmin, true));
    if (Number(adminCount[0]?.count ?? 0) <= 1) {
      res.status(400).json({
        error: "Cannot delete the only remaining admin. Promote another user first.",
      });
      return;
    }
  }
  // Atomic: all child rows + the account row must be removed together.
  await db.transaction(async (tx) => {
    await tx.delete(holdings).where(eq(holdings.userId, userId));
    await tx.delete(orders).where(eq(orders.userId, userId));
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
  });
  res.json({ ok: true });
});

router.get("/orders", async (_req, res: Response) => {
  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(200);
  // Join in display names
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const accountRows = userIds.length
    ? await db.select().from(accounts).where(inArray(accounts.userId, userIds))
    : [];
  const userMap = new Map(
    accountRows.map((a) => [a.userId, { name: a.displayName, email: a.email }]),
  );
  res.json(
    rows.map((o) => ({
      id: o.id,
      userId: o.userId,
      userName: userMap.get(o.userId)?.name ?? "Unknown",
      userEmail: userMap.get(o.userId)?.email ?? null,
      symbol: o.symbol,
      side: o.side,
      quantity: Number(o.quantity),
      price: Number(o.price),
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

router.get("/transactions", async (_req, res: Response) => {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(200);
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const accountRows = userIds.length
    ? await db.select().from(accounts).where(inArray(accounts.userId, userIds))
    : [];
  const userMap = new Map(
    accountRows.map((a) => [a.userId, { name: a.displayName, email: a.email }]),
  );
  res.json(
    rows.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: userMap.get(t.userId)?.name ?? "Unknown",
      userEmail: userMap.get(t.userId)?.email ?? null,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      symbol: t.symbol ?? undefined,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

export default router;
