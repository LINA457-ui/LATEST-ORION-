import { Router, type IRouter, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import {
  accounts,
  adminPins,
  holdings,
  orders,
  transactions,
} from "@workspace/db/schema";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  requirePinVerified,
  userIdOf,
} from "../lib/auth";
import { getMeta, getQuote } from "../lib/marketData";
import {
  ensureDefaultPin,
  hashPin,
  issuePinToken,
  MAX_PINS,
  verifyPin,
} from "../lib/adminPin";
import { syncClerkUserToDb } from "../lib/syncClerkUser";

const router: IRouter = Router();

router.use(requireAuth);

async function getOrSyncAccount(userId: string) {
  return await syncClerkUserToDb(userId);
}

router.get("/dashboard", async (req, res: Response) => {
  const userId = userIdOf(req);
  const snapshot = await getAccountSnapshot(userId);

  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));

  const positions = userHoldings.map((h) => {
    const q = getQuote(h.symbol);
    const meta = getMeta(h.symbol);

    const quantity = Number(h.quantity);
    const averageCost = Number(h.averageCost);
    const currentPrice = q?.price ?? 0;
    const marketValue = +(quantity * currentPrice).toFixed(2);

    return {
      id: h.id,
      symbol: h.symbol,
      name: meta?.name ?? h.symbol,
      quantity,
      averageCost,
      currentPrice,
      marketValue,
      dayChange: q ? +(quantity * q.change).toFixed(2) : 0,
      dayChangePercent: q?.changePercent ?? 0,
    };
  });

  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(5);

  res.json({
    account: snapshot,
    positions,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      quantity: Number(o.quantity),
      price: Number(o.price),
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
    })),
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

router.get("/check", async (req, res: Response) => {
  try {
    const userId = userIdOf(req);
    const account = await getOrSyncAccount(userId);

    res.json({ isAdmin: !!account?.isAdmin });
  } catch (error) {
    console.error("Admin check failed:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

router.get("/ping", (_req, res: Response) => {
  res.json({ ok: true, route: "admin mounted" });
});

router.post("/pin/verify", async (req, res: Response) => {
  try {
    const userId = userIdOf(req);
    const { pin } = (req.body ?? {}) as { pin?: string };

    if (typeof pin !== "string" || pin.length === 0) {
      res.status(400).json({ error: "PIN required" });
      return;
    }

    await ensureDefaultPin();

    const ok = await verifyPin(pin);

    if (!ok) {
      res.status(401).json({
        error: "That PIN didn't work. Please double-check and try again.",
      });
      return;
    }

    const account = await getOrSyncAccount(userId);

    await db
      .update(accounts)
      .set({ isAdmin: true })
      .where(eq(accounts.userId, account.userId));

    const token = issuePinToken(userId);

    res.json({ ok: true, token });
  } catch (error) {
    console.error("PIN verification failed:", error);
    res.status(500).json({ error: "PIN verification failed" });
  }
});

router.use(requireAdmin);

router.get("/pins", requirePinVerified, async (_req, res: Response) => {
  const rows = await db
    .select({
      id: adminPins.id,
      label: adminPins.label,
      createdBy: adminPins.createdBy,
      createdAt: adminPins.createdAt,
    })
    .from(adminPins)
    .orderBy(desc(adminPins.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      label: r.label,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/pins", requirePinVerified, async (req, res: Response) => {
  const userId = userIdOf(req);
  const { pin, label } = (req.body ?? {}) as { pin?: string; label?: string };

  if (typeof pin !== "string" || pin.length < 4 || pin.length > 12) {
    res.status(400).json({ error: "PIN must be 4 to 12 characters." });
    return;
  }

  const newHash = hashPin(pin);
  const trimmedLabel =
    typeof label === "string" && label.trim() ? label.trim() : null;

  try {
    const created = await db.transaction(async (tx) => {
      const [{ value: existing }] = await tx
        .select({ value: count() })
        .from(adminPins);

      if (Number(existing) >= MAX_PINS) {
        throw new Error(
          `Maximum of ${MAX_PINS} PINs allowed. Remove one before adding a new one.`,
        );
      }

      const [row] = await tx
        .insert(adminPins)
        .values({
          pinHash: newHash,
          label: trimmedLabel,
          createdBy: userId,
        })
        .returning();

      return row;
    });

    res.json({ ok: true, id: created.id });
  } catch (e) {
    const msg = (e as Error).message ?? "Failed to add PIN";

    if (
      msg.includes("admin_pins_pin_hash_unique") ||
      msg.includes("duplicate key")
    ) {
      res.status(400).json({ error: "That PIN is already in use." });
      return;
    }

    res.status(400).json({ error: msg });
  }
});

router.patch("/pins/:id", requirePinVerified, async (req, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid PIN id" });
    return;
  }

  const { pin, label } = (req.body ?? {}) as { pin?: string; label?: string };
  const updates: Record<string, unknown> = {};

  if (typeof pin === "string") {
    if (pin.length < 4 || pin.length > 12) {
      res.status(400).json({ error: "PIN must be 4 to 12 characters." });
      return;
    }

    updates.pinHash = hashPin(pin);
  }

  if (typeof label === "string") {
    updates.label = label.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const [updated] = await db
      .update(adminPins)
      .set(updates)
      .where(eq(adminPins.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "PIN not found" });
      return;
    }

    res.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message ?? "Failed to update PIN";

    if (
      msg.includes("admin_pins_pin_hash_unique") ||
      msg.includes("duplicate key")
    ) {
      res.status(400).json({ error: "That PIN is already in use." });
      return;
    }

    res.status(400).json({ error: msg });
  }
});

router.delete("/pins/:id", requirePinVerified, async (req, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid PIN id" });
    return;
  }

  const [{ value: total }] = await db.select({ value: count() }).from(adminPins);

  if (Number(total) <= 1) {
    res.status(400).json({
      error: "Cannot remove the last PIN. Add another PIN first.",
    });
    return;
  }

  const [removed] = await db
    .delete(adminPins)
    .where(eq(adminPins.id, id))
    .returning();

  if (!removed) {
    res.status(404).json({ error: "PIN not found" });
    return;
  }

  res.json({ ok: true });
});

router.use(requirePinVerified);

router.get("/overview", async (_req, res: Response) => {
  const clerkUsers = await clerkClient.users.getUserList({ limit: 1 });
  const totalUsers = clerkUsers.totalCount ?? 0;

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
    totalUsers,
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
  const clerkUsers = await clerkClient.users.getUserList({
    limit: 100,
    orderBy: "-created_at",
  });

  const users = await Promise.all(
    clerkUsers.data.map(async (clerkUser) => {
      const account = await getOrSyncAccount(clerkUser.id);

      const userHoldings = await db
        .select()
        .from(holdings)
        .where(eq(holdings.userId, clerkUser.id));

      let portfolioValue = 0;

      for (const h of userHoldings) {
        const q = getQuote(h.symbol);
        if (q) portfolioValue += Number(h.quantity) * q.price;
      }

      const cash = Number(account.cashBalance);
      const computedTotal = +(cash + portfolioValue).toFixed(2);

      return {
        userId: account.userId,
        displayName: account.displayName,
        email: account.email,
        avatarUrl: account.avatarUrl,
        cashBalance: cash,
        portfolioValue: +portfolioValue.toFixed(2),
        totalEquity:
          account.equityOverride != null
            ? Number(account.equityOverride)
            : computedTotal,
        positionCount: userHoldings.length,
        isAdmin: account.isAdmin,
        isSuspended: account.isSuspended,
        hasOverrides:
          account.equityOverride != null ||
          account.marketValueOverride != null ||
          account.buyingPowerOverride != null ||
          account.dayChangeOverride != null ||
          account.dayChangePercentOverride != null,
        createdAt: account.createdAt.toISOString(),
      };
    }),
  );

  res.json(users);
});

router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const account = await syncClerkUserToDb(userId);

    const cashBalance = Number(account.cashBalance ?? 0);

    const portfolioValue =
      account.marketValueOverride != null
        ? Number(account.marketValueOverride)
        : 0;

    const totalEquity =
      account.equityOverride != null
        ? Number(account.equityOverride)
        : cashBalance + portfolioValue;

    const buyingPower =
      account.buyingPowerOverride != null
        ? Number(account.buyingPowerOverride)
        : cashBalance;

    const dayChange =
      account.dayChangeOverride != null ? Number(account.dayChangeOverride) : 0;

    const dayChangePercent =
      account.dayChangePercentOverride != null
        ? Number(account.dayChangePercentOverride)
        : 0;

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(100);

    const userPositions = await db
      .select()
      .from(holdings)
      .where(eq(holdings.userId, userId));

    res.json({
      account: {
        userId: account.userId,
        displayName: account.displayName,
        email: account.email,
        avatarUrl: account.avatarUrl,

        isAdmin: account.isAdmin,
        isSuspended: account.isSuspended,

        cashBalance,
        totalEquity,
        portfolioValue,
        buyingPower,
        dayChange,
        dayChangePercent,

        displayedTotalEquity: totalEquity,
        displayedPortfolioValue: portfolioValue,
        displayedBuyingPower: buyingPower,
        displayedDayChange: dayChange,
        displayedDayChangePercent: dayChangePercent,

        overrides: {
          equity:
            account.equityOverride != null
              ? Number(account.equityOverride)
              : null,
          marketValue:
            account.marketValueOverride != null
              ? Number(account.marketValueOverride)
              : null,
          buyingPower:
            account.buyingPowerOverride != null
              ? Number(account.buyingPowerOverride)
              : null,
          dayChange:
            account.dayChangeOverride != null
              ? Number(account.dayChangeOverride)
              : null,
          dayChangePercent:
            account.dayChangePercentOverride != null
              ? Number(account.dayChangePercentOverride)
              : null,
        },
      },

      positions: userPositions.map((p) => {
        const q = getQuote(p.symbol);
        const meta = getMeta(p.symbol);

        const quantity = Number(p.quantity);
        const averageCost = Number(p.averageCost);
        const currentPrice = q?.price ?? 0;

        return {
          id: p.id,
          symbol: p.symbol,
          name: meta?.name ?? p.symbol,
          quantity,
          averageCost,
          currentPrice,
          marketValue: +(quantity * currentPrice).toFixed(2),
        };
      }),

      transactions: userTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.amount),
        symbol: t.symbol ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Admin user fetch failed:", err);
    res.status(500).json({
      error: "Admin user fetch failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
router.patch("/users/:userId", async (req, res: Response) => {
  const { userId } = req.params;

  const { displayName, email, avatarUrl, isAdmin, isSuspended } =
    req.body ?? {};

  const updates: Record<string, unknown> = {};

  if (typeof displayName === "string") {
    updates.displayName = displayName.trim() || "User";
  }

  if (typeof email === "string") {
    updates.email = email.trim() || null;
  }

  if (typeof avatarUrl === "string") {
    updates.avatarUrl = avatarUrl.trim() || null;
  }

  if (typeof isAdmin === "boolean") {
    updates.isAdmin = isAdmin;
  }

  if (typeof isSuspended === "boolean") {
    updates.isSuspended = isSuspended;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.userId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User account not found." });
    return;
  }

  res.json({ ok: true, account: updated });
});
router.patch("/users/:userId/cash", async (req, res: Response) => {
  try {
    const { userId } = req.params;
    const { cashBalance, note } = req.body ?? {};

    const nextCash = Number(cashBalance);

    if (!Number.isFinite(nextCash) || nextCash < 0) {
      res.status(400).json({ error: "Enter a valid cash balance." });
      return;
    }

    await getOrSyncAccount(userId);

    const [oldAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));

    if (!oldAccount) {
      res.status(404).json({ error: "User account not found." });
      return;
    }

    const oldBalance = Number(oldAccount.cashBalance ?? 0);
    const delta = nextCash - oldBalance;

    const [updated] = await db
      .update(accounts)
      .set({
        cashBalance: nextCash.toFixed(2),
      })
      .where(eq(accounts.userId, userId))
      .returning();

    if (note && String(note).trim()) {
      await db.insert(transactions).values({
        userId,
        type: "adjustment",
        description: String(note).trim(),
        amount: delta.toFixed(2),
      });
    }

    res.json({
      ok: true,
      oldBalance,
      newBalance: Number(updated.cashBalance),
      delta,
    });
  } catch (error) {
    console.error("Cash update failed:", error);
    res.status(500).json({ error: "Cash update failed" });
  }
});
router.patch("/users/:userId/overrides", async (req, res: Response) => {
  const { userId } = req.params;
  const body = req.body ?? {};

  const updates: Record<string, unknown> = {};

  function toDbNumber(value: unknown, scale: 2 | 4 = 2) {
    if (value === null) return null;
    if (value === undefined) return undefined;

    const num = Number(value);

    if (!Number.isFinite(num)) {
      throw new Error("Override value must be a valid number.");
    }

    return num.toFixed(scale);
  }

  try {
    if ("equity" in body) {
      updates.equityOverride = toDbNumber(body.equity, 2);
    }

    if ("marketValue" in body) {
      updates.marketValueOverride = toDbNumber(body.marketValue, 2);
    }

    if ("buyingPower" in body) {
      updates.buyingPowerOverride = toDbNumber(body.buyingPower, 2);
    }

    if ("dayChange" in body) {
      updates.dayChangeOverride = toDbNumber(body.dayChange, 2);
    }

    if ("dayChangePercent" in body) {
      updates.dayChangePercentOverride = toDbNumber(body.dayChangePercent, 4);
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No override fields provided." });
    return;
  }

  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.userId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ ok: true, account: updated });
});

router.post("/users/:userId/holdings", async (req, res: Response) => {
  const { userId } = req.params;
  await getOrSyncAccount(userId);

  const { symbol, quantity, averageCost } = req.body ?? {};

  const cleanSymbol =
    typeof symbol === "string" ? symbol.trim().toUpperCase() : "";

  if (!cleanSymbol) {
    res.status(400).json({ error: "Symbol required" });
    return;
  }

  const qty = Number(quantity);
  const cost = Number(averageCost);

  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400).json({ error: "Quantity must be greater than 0" });
    return;
  }

  if (!Number.isFinite(cost) || cost < 0) {
    res.status(400).json({ error: "Average cost must be 0 or greater" });
    return;
  }

  await db
    .insert(holdings)
    .values({
      userId,
      symbol: cleanSymbol,
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
  await getOrSyncAccount(userId);

  await db
    .delete(holdings)
    .where(
      and(eq(holdings.userId, userId), eq(holdings.symbol, symbol.toUpperCase())),
    );

  res.json({ ok: true });
});
const ALLOWED_TX_TYPES = new Set([
  "deposit",
  "withdrawal",
  "buy",
  "sell",
  "dividend",
  "fee",
  "interest",
  "transfer",
  "adjustment",
]);

router.post("/users/:userId/transactions", async (req, res: Response) => {
  const { userId } = req.params;
  await getOrSyncAccount(userId);

  const { type, description, amount, symbol, createdAt } = (req.body ?? {}) as {
    type?: string;
    description?: string;
    amount?: number | string;
    symbol?: string | null;
    createdAt?: string;
  };

  if (typeof type !== "string" || !ALLOWED_TX_TYPES.has(type)) {
    res.status(400).json({
      error: `Type must be one of: ${Array.from(ALLOWED_TX_TYPES).join(", ")}`,
    });
    return;
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    res.status(400).json({ error: "Description required" });
    return;
  }

  const amt = Number(amount);

  if (!Number.isFinite(amt)) {
    res.status(400).json({ error: "Amount must be a number" });
    return;
  }

  let when: Date | undefined = undefined;

  if (typeof createdAt === "string" && createdAt.length > 0) {
    const parsed = new Date(createdAt);

    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: "Invalid createdAt date" });
      return;
    }

    when = parsed;
  }

  const sanitizedSymbol =
    typeof symbol === "string" && symbol.trim().length > 0
      ? symbol.trim().toUpperCase()
      : null;

  const [created] = await db
    .insert(transactions)
    .values({
      userId,
      type,
      description: description.trim(),
      amount: amt.toFixed(2),
      symbol: sanitizedSymbol,
      ...(when ? { createdAt: when } : {}),
    })
    .returning();

  res.json({
    ok: true,
    transaction: {
      id: created.id,
      type: created.type,
      description: created.description,
      amount: Number(created.amount),
      symbol: created.symbol,
      createdAt: created.createdAt.toISOString(),
    },
  });
});

router.patch("/transactions/:id", async (req, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid transaction id" });
    return;
  }

  const { type, description, amount, symbol, createdAt } = (req.body ?? {}) as {
    type?: string;
    description?: string;
    amount?: number | string;
    symbol?: string | null;
    createdAt?: string;
  };

  const updates: Record<string, unknown> = {};

  if (typeof type === "string") {
    if (!ALLOWED_TX_TYPES.has(type)) {
      res.status(400).json({ error: "Invalid transaction type" });
      return;
    }

    updates.type = type;
  }

  if (typeof description === "string") {
    if (description.trim().length === 0) {
      res.status(400).json({ error: "Description cannot be empty" });
      return;
    }

    updates.description = description.trim();
  }

  if (amount !== undefined) {
    const amt = Number(amount);

    if (!Number.isFinite(amt)) {
      res.status(400).json({ error: "Amount must be a number" });
      return;
    }

    updates.amount = amt.toFixed(2);
  }

  if (symbol !== undefined) {
    updates.symbol =
      typeof symbol === "string" && symbol.trim().length > 0
        ? symbol.trim().toUpperCase()
        : null;
  }

  if (typeof createdAt === "string" && createdAt.length > 0) {
    const parsed = new Date(createdAt);

    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: "Invalid createdAt date" });
      return;
    }

    updates.createdAt = parsed;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ ok: true });
});

router.delete("/transactions/:id", async (req, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid transaction id" });
    return;
  }

  const [removed] = await db
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning();

  if (!removed) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ ok: true });
});
router.delete("/users/:userId", async (req, res: Response) => {
  const { userId } = req.params;
  const target = await getOrSyncAccount(userId);

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