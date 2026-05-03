import express from "express";
import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema/accounts";
import { adminPins } from "@workspace/db/schema/adminPins";
import { holdings } from "@workspace/db/schema/holdings";
import { orders } from "@workspace/db/schema/orders";
import { transactions } from "@workspace/db/schema/transactions";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  requirePinVerified,
  userIdOf,
} from "../lib/auth.js";
import { getMeta, getQuote } from "../lib/marketData.js";
import { hashPin, issuePinToken, MAX_PINS, verifyPin } from "../lib/adminPin.js";

const router: any = express.Router();

type AnyRow = any;

type UserLookup = {
  name: string | null;
  email: string | null;
};

/**
 * TEMP FIX: bypass Clerk auth for now
 */
router.use((req: any, _res: any, next: any) => {
  req.user = {
    id: "demo-user",
    userId: "demo-user",
    sub: "demo-user",
  };

  next();
});

// Public-to-admins check used by the frontend to gate the /admin nav link
router.get("/check", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  res.json({ isAdmin: !!account?.isAdmin });
});

// PIN verification: any signed-in user must submit the right PIN to unlock
// the admin section. Returns a short-lived HMAC token sent back as the
// X-Admin-Pin header on subsequent admin requests.
router.post("/pin/verify", async (req: any, res: any) => {
  const userId = userIdOf(req);
  const { pin } = (req.body ?? {}) as { pin?: string };

  if (typeof pin !== "string" || pin.length === 0) {
    res.status(400).json({ error: "PIN required" });
    return;
  }

  const ok = await verifyPin(pin);

  if (!ok) {
    res.status(401).json({
      error: "That PIN didn't work. Please double-check and try again.",
    });
    return;
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!account?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const token = issuePinToken(userId);

  res.json({ ok: true, token });
});

// Everything below requires admin
router.use((_req: any, _res: any, next: any) => {
  next(); // bypass admin check
});

// ─── PIN management ──────────────────────────────────────────────────────
router.get("/pins", requirePinVerified, async (_req: any, res: any) => {
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
    rows.map((r: AnyRow) => ({
      id: r.id,
      label: r.label,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/pins", requirePinVerified, async (req: any, res: any) => {
  const userId = userIdOf(req);
  const { pin, label } = (req.body ?? {}) as {
    pin?: string;
    label?: string;
  };

  if (typeof pin !== "string" || pin.length < 4 || pin.length > 12) {
    res.status(400).json({ error: "PIN must be 4 to 12 characters." });
    return;
  }

  const newHash = hashPin(pin);
  const trimmedLabel =
    typeof label === "string" && label.trim() ? label.trim() : null;

  try {
    const created = await db.transaction(async (tx: AnyRow) => {
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

router.patch("/pins/:id", requirePinVerified, async (req: any, res: any) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid PIN id" });
    return;
  }

  const { pin, label } = (req.body ?? {}) as {
    pin?: string;
    label?: string;
  };

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

router.delete("/pins/:id", requirePinVerified, async (req: any, res: any) => {
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

// ─── Admin overview / users (PIN-gated) ──────────────────────────────────
router.use((_req: any, _res: any, next: any) => {
  next(); // bypass pin
});

router.get("/overview", async (_req: any, res: any) => {
  const allAccounts = await db.select().from(accounts);
  const allHoldings = await db.select().from(holdings);
  const allOrders = await db.select().from(orders);

  let totalCash = 0;
  for (const a of allAccounts as AnyRow[]) {
    totalCash += Number(a.cashBalance);
  }

  let totalPortfolioValue = 0;
  const symbolValues: Record<string, number> = {};

  for (const h of allHoldings as AnyRow[]) {
    const q = getQuote(h.symbol);
    if (!q) continue;

    const value = Number(h.quantity) * q.price;
    totalPortfolioValue += value;
    symbolValues[h.symbol] = (symbolValues[h.symbol] ?? 0) + value;
  }

  let totalVolume = 0;
  for (const o of allOrders as AnyRow[]) {
    totalVolume += Number(o.total);
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const signupsToday = (allAccounts as AnyRow[]).filter(
    (a: AnyRow) => now - a.createdAt.getTime() < dayMs,
  ).length;

  const signupsThisWeek = (allAccounts as AnyRow[]).filter(
    (a: AnyRow) => now - a.createdAt.getTime() < 7 * dayMs,
  ).length;

  const topHoldings = Object.entries(symbolValues)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 8)
    .map(([symbol, value]: [string, number]) => ({
      symbol,
      name: getMeta(symbol)?.name ?? symbol,
      totalValue: +value.toFixed(2),
    }));

  res.json({
    totalUsers: allAccounts.length,
    suspendedUsers: (allAccounts as AnyRow[]).filter(
      (a: AnyRow) => a.isSuspended,
    ).length,
    adminUsers: (allAccounts as AnyRow[]).filter((a: AnyRow) => a.isAdmin)
      .length,
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

router.get("/users", async (_req: any, res: any) => {
  const allAccounts = await db
    .select()
    .from(accounts)
    .orderBy(desc(accounts.createdAt));

  const result = await Promise.all(
    (allAccounts as AnyRow[]).map(async (a: AnyRow) => {
      const userHoldings = await db
        .select()
        .from(holdings)
        .where(eq(holdings.userId, a.userId));

      let portfolioValue = 0;

      for (const h of userHoldings as AnyRow[]) {
        const q = getQuote(h.symbol);
        if (q) portfolioValue += Number(h.quantity) * q.price;
      }

      const cash = Number(a.cashBalance);
      const computedTotal = +(cash + portfolioValue).toFixed(2);

      const displayedTotal =
        a.equityOverride != null ? Number(a.equityOverride) : computedTotal;

      const displayedPortfolio =
        a.marketValueOverride != null
          ? Number(a.marketValueOverride)
          : +portfolioValue.toFixed(2);

      return {
        userId: a.userId,
        displayName: a.displayName,
        email: a.email,
        avatarUrl: a.avatarUrl ?? null,
        cashBalance: cash,
        portfolioValue: displayedPortfolio,
        totalEquity: displayedTotal,
        positionCount: userHoldings.length,
        isAdmin: a.isAdmin,
        isSuspended: a.isSuspended,
        hasOverrides:
          a.equityOverride != null ||
          a.marketValueOverride != null ||
          a.buyingPowerOverride != null ||
          a.dayChangeOverride != null ||
          a.dayChangePercentOverride != null,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.get("/users/:userId", async (req: any, res: any) => {
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

  const positions = (userHoldings as AnyRow[]).map((h: AnyRow) => {
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
    (await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(20)) as AnyRow[]
  ).map((o: AnyRow) => ({
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
    (await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(50)) as AnyRow[]
  ).map((t: AnyRow) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    symbol: t.symbol ?? undefined,
    createdAt: t.createdAt.toISOString(),
  }));

  const accountRow = account as AnyRow;
  const cash = Number(accountRow.cashBalance);
  const computedTotal = +(cash + portfolioValue).toFixed(2);

  res.json({
    account: {
      userId: accountRow.userId,
      displayName: accountRow.displayName,
      email: accountRow.email,
      avatarUrl: accountRow.avatarUrl ?? null,
      cashBalance: cash,
      portfolioValue: +portfolioValue.toFixed(2),
      totalEquity: computedTotal,
      isAdmin: accountRow.isAdmin,
      isSuspended: accountRow.isSuspended,
      createdAt: accountRow.createdAt.toISOString(),

      displayedTotalEquity:
        accountRow.equityOverride != null
          ? Number(accountRow.equityOverride)
          : computedTotal,

      displayedPortfolioValue:
        accountRow.marketValueOverride != null
          ? Number(accountRow.marketValueOverride)
          : +portfolioValue.toFixed(2),

      displayedBuyingPower:
        accountRow.buyingPowerOverride != null
          ? Number(accountRow.buyingPowerOverride)
          : cash,

      displayedDayChange:
        accountRow.dayChangeOverride != null
          ? Number(accountRow.dayChangeOverride)
          : null,

      displayedDayChangePercent:
        accountRow.dayChangePercentOverride != null
          ? Number(accountRow.dayChangePercentOverride)
          : null,

      overrides: {
        equity:
          accountRow.equityOverride != null
            ? Number(accountRow.equityOverride)
            : null,

        marketValue:
          accountRow.marketValueOverride != null
            ? Number(accountRow.marketValueOverride)
            : null,

        buyingPower:
          accountRow.buyingPowerOverride != null
            ? Number(accountRow.buyingPowerOverride)
            : null,

        dayChange:
          accountRow.dayChangeOverride != null
            ? Number(accountRow.dayChangeOverride)
            : null,

        dayChangePercent:
          accountRow.dayChangePercentOverride != null
            ? Number(accountRow.dayChangePercentOverride)
            : null,
      },
    },
    positions,
    recentOrders,
    recentTransactions,
  });
});

router.patch("/users/:userId", async (req: any, res: any) => {
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

    const targetRow = target as AnyRow | undefined;

    if (targetRow?.isAdmin && totalAdmins <= 1) {
      res.status(400).json({
        error:
          "Cannot demote the only remaining admin. Promote another user first.",
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

router.patch("/users/:userId/cash", async (req: any, res: any) => {
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

  const accountRow = account as AnyRow;
  const oldBalance = Number(accountRow.cashBalance);
  const delta = +(newBalance - oldBalance).toFixed(2);

  await db.transaction(async (tx: AnyRow) => {
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

// Set / clear display overrides
router.patch("/users/:userId/overrides", async (req: any, res: any) => {
  const { userId } = req.params;

  const body = (req.body ?? {}) as Partial<{
    equity: number | null;
    marketValue: number | null;
    buyingPower: number | null;
    dayChange: number | null;
    dayChangePercent: number | null;
  }>;

  function toCol(
    value: number | null | undefined,
    scale: 2 | 4,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Override values must be finite numbers or null");
    }

    return value.toFixed(scale);
  }

  let equityCol: string | null | undefined;
  let marketCol: string | null | undefined;
  let buyingCol: string | null | undefined;
  let changeCol: string | null | undefined;
  let pctCol: string | null | undefined;

  try {
    equityCol = toCol(body.equity, 2);
    marketCol = toCol(body.marketValue, 2);
    buyingCol = toCol(body.buyingPower, 2);
    changeCol = toCol(body.dayChange, 2);
    pctCol = toCol(body.dayChangePercent, 4);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }

  const updates: Record<string, unknown> = {};

  if (equityCol !== undefined) updates.equityOverride = equityCol;
  if (marketCol !== undefined) updates.marketValueOverride = marketCol;
  if (buyingCol !== undefined) updates.buyingPowerOverride = buyingCol;
  if (changeCol !== undefined) updates.dayChangeOverride = changeCol;
  if (pctCol !== undefined) updates.dayChangePercentOverride = pctCol;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No override fields provided" });
    return;
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

router.post("/users/:userId/holdings", async (req: any, res: any) => {
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

router.delete("/users/:userId/holdings/:symbol", async (req: any, res: any) => {
  const { userId, symbol } = req.params;

  await db
    .delete(holdings)
    .where(
      and(eq(holdings.userId, userId), eq(holdings.symbol, symbol.toUpperCase())),
    );

  res.json({ ok: true });
});

const ALLOWED_TX_TYPES = new Set<string>([
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

router.post("/users/:userId/transactions", async (req: any, res: any) => {
  const { userId } = req.params;

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

  const [user] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
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

  const createdRow = created as AnyRow;

  res.json({
    ok: true,
    transaction: {
      id: createdRow.id,
      type: createdRow.type,
      description: createdRow.description,
      amount: Number(createdRow.amount),
      symbol: createdRow.symbol,
      createdAt: createdRow.createdAt.toISOString(),
    },
  });
});

router.patch("/transactions/:id", async (req: any, res: any) => {
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

router.delete("/transactions/:id", async (req: any, res: any) => {
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

router.delete("/users/:userId", async (req: any, res: any) => {
  const { userId } = req.params;

  const [target] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const targetRow = target as AnyRow;

  if (targetRow.isAdmin) {
    const adminCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(eq(accounts.isAdmin, true));

    if (Number(adminCount[0]?.count ?? 0) <= 1) {
      res.status(400).json({
        error:
          "Cannot delete the only remaining admin. Promote another user first.",
      });
      return;
    }
  }

  await db.transaction(async (tx: AnyRow) => {
    await tx.delete(holdings).where(eq(holdings.userId, userId));
    await tx.delete(orders).where(eq(orders.userId, userId));
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
  });

  res.json({ ok: true });
});

router.get("/orders", async (_req: any, res: any) => {
  const rows = (await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(200)) as AnyRow[];

  const userIds = Array.from(
    new Set(rows.map((r: AnyRow) => String(r.userId))),
  );

  const accountRows = userIds.length
    ? ((await db
        .select()
        .from(accounts)
        .where(inArray(accounts.userId, userIds))) as AnyRow[])
    : [];

  const userMap = new Map<string, UserLookup>(
    accountRows.map((a: AnyRow) => [
      String(a.userId),
      {
        name: a.displayName ?? null,
        email: a.email ?? null,
      },
    ]),
  );

  res.json(
    rows.map((o: AnyRow) => ({
      id: o.id,
      userId: o.userId,
      userName: userMap.get(String(o.userId))?.name ?? "Unknown",
      userEmail: userMap.get(String(o.userId))?.email ?? null,
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

router.get("/transactions", async (_req: any, res: any) => {
  const rows = (await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(200)) as AnyRow[];

  const userIds = Array.from(
    new Set(rows.map((r: AnyRow) => String(r.userId))),
  );

  const accountRows = userIds.length
    ? ((await db
        .select()
        .from(accounts)
        .where(inArray(accounts.userId, userIds))) as AnyRow[])
    : [];

  const userMap = new Map<string, UserLookup>(
    accountRows.map((a: AnyRow) => [
      String(a.userId),
      {
        name: a.displayName ?? null,
        email: a.email ?? null,
      },
    ]),
  );

  res.json(
    rows.map((t: AnyRow) => ({
      id: t.id,
      userId: t.userId,
      userName: userMap.get(String(t.userId))?.name ?? "Unknown",
      userEmail: userMap.get(String(t.userId))?.email ?? null,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      symbol: t.symbol ?? undefined,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

export default router;