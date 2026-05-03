import express from "express";
import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema/accounts";
import { holdings } from "@workspace/db/schema/holdings";
import { orders } from "@workspace/db/schema/orders";
import { transactions } from "@workspace/db/schema/transactions";
import { watchlist } from "@workspace/db/schema/watchlist";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, ensureAccount, userIdOf } from "../lib/auth.js";
import {
  getEquityCurve,
  getIndices,
  getMeta,
  getMovers,
  getNews,
  getQuote,
  POPULAR_SYMBOLS,
  type Range,
} from "../lib/marketData.js";

const AddToWatchlistBody = {
  parse(data: any) {
    return data;
  },
};

const RemoveFromWatchlistParams = {
  parse(data: any) {
    return data;
  },
};

const GetAccountPerformanceQueryParams = {
  parse(data: any) {
    return data;
  },
};

const router: any = express.Router();

router.use((req: any, _res: any, next: any) => {

  req.user = {
    id: "demo-user",
    userId: "demo-user",
    sub: "demo-user",
  };

  next();
});

export type AccountSnapshot = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  cashBalance: number;
  totalEquity: number;
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  buyingPower: number;
  displayedTotalEquity: number;
  displayedPortfolioValue: number;
  displayedBuyingPower: number;
  displayedDayChange: number;
  displayedDayChangePercent: number;
  overrides: {
    equity: number | null;
    marketValue: number | null;
    buyingPower: number | null;
    dayChange: number | null;
    dayChangePercent: number | null;
  };
};

type Position = {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
};

export async function getAccountSnapshot(
  userId: string,
): Promise<AccountSnapshot> {
  const account = await ensureAccount(userId);

  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));

  let portfolioValue = 0;
  let dayChange = 0;

  for (const h of userHoldings) {
    const quote = getQuote(h.symbol);
    if (!quote) continue;

    const qty = Number(h.quantity);
    portfolioValue += qty * quote.price;
    dayChange += qty * quote.change;
  }

  const cashBalance = Number(account.cashBalance);

  const computedPortfolioValue = Number(portfolioValue.toFixed(2));
  const computedTotalEquity = Number((portfolioValue + cashBalance).toFixed(2));
  const computedDayChange = Number(dayChange.toFixed(2));
  const previousValue = computedTotalEquity - computedDayChange;

  const computedDayChangePercent =
    previousValue > 0
      ? Number(((computedDayChange / previousValue) * 100).toFixed(2))
      : 0;

  const portfolioValueDisplay =
    account.marketValueOverride != null
      ? Number(account.marketValueOverride)
      : computedPortfolioValue;

  const totalEquityDisplay =
    account.equityOverride != null
      ? Number(account.equityOverride)
      : computedTotalEquity;

  const buyingPowerDisplay =
    account.buyingPowerOverride != null
      ? Number(account.buyingPowerOverride)
      : cashBalance;

  const dayChangeDisplay =
    account.dayChangeOverride != null
      ? Number(account.dayChangeOverride)
      : computedDayChange;

  const dayChangePercentDisplay =
    account.dayChangePercentOverride != null
      ? Number(account.dayChangePercentOverride)
      : computedDayChangePercent;

  return {
    userId,
    displayName: account.displayName ?? null,
    avatarUrl: account.avatarUrl ?? null,
    cashBalance,
    totalEquity: totalEquityDisplay,
    portfolioValue: portfolioValueDisplay,
    dayChange: dayChangeDisplay,
    dayChangePercent: dayChangePercentDisplay,
    buyingPower: buyingPowerDisplay,
    displayedTotalEquity: totalEquityDisplay,
    displayedPortfolioValue: portfolioValueDisplay,
    displayedBuyingPower: buyingPowerDisplay,
    displayedDayChange: dayChangeDisplay,
    displayedDayChangePercent: dayChangePercentDisplay,
    overrides: {
      equity:
        account.equityOverride != null ? Number(account.equityOverride) : null,
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
  };
}

router.get("/me", async (req: any, res: any) => {
  const userId = userIdOf(req);
  const snapshot = await getAccountSnapshot(userId);
  res.json(snapshot);
});

router.post("/sync", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const { email, displayName } = (req.body ?? {}) as {
    email?: string;
    displayName?: string;
  };

  await ensureAccount(userId, displayName, email);
  res.json({ ok: true, userId });
});

router.post("/avatar", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const { avatarUrl } = (req.body ?? {}) as {
    avatarUrl?: string | null;
  };

  if (avatarUrl === null || avatarUrl === "") {
    await db
      .update(accounts)
      .set({ avatarUrl: null })
      .where(eq(accounts.userId, userId));

    res.json({ ok: true, avatarUrl: null });
    return;
  }

  if (typeof avatarUrl !== "string") {
    res.status(400).json({ error: "avatarUrl must be a string or null" });
    return;
  }

  const dataUrlRe = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

  if (!dataUrlRe.test(avatarUrl)) {
    res.status(400).json({
      error: "Avatar must be a base64-encoded JPEG, PNG, or WEBP data URL.",
    });
    return;
  }

  if (avatarUrl.length > 600_000) {
    res.status(413).json({
      error: "Image too large. Please upload a smaller picture.",
    });
    return;
  }

  await ensureAccount(userId);

  await db
    .update(accounts)
    .set({ avatarUrl })
    .where(eq(accounts.userId, userId));

  res.json({ ok: true, avatarUrl });
});

router.get("/performance", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const parsed = GetAccountPerformanceQueryParams.parse(req.query ?? {});
  const range = (parsed.range ?? "1M") as Range;

  const snapshot = await getAccountSnapshot(userId);
  const curve = getEquityCurve(snapshot.totalEquity, range);

  const change = Number((curve.endValue - curve.startValue).toFixed(2));

  const changePercent =
    curve.startValue > 0
      ? Number(((change / curve.startValue) * 100).toFixed(2))
      : 0;

  res.json({
    range,
    points: curve.points,
    startValue: curve.startValue,
    endValue: curve.endValue,
    change,
    changePercent,
  });
});

router.get("/transactions", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  res.json(
    rows.map((t: any) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      symbol: t.symbol ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

router.post("/transactions", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const { type, description, amount, symbol } = (req.body ?? {}) as {
    type?: string;
    description?: string;
    amount?: number | string;
    symbol?: string | null;
  };

  if (!type || typeof type !== "string") {
    res.status(400).json({ error: "Transaction type is required." });
    return;
  }

  if (!description || typeof description !== "string") {
    res.status(400).json({ error: "Transaction description is required." });
    return;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    res.status(400).json({
      error: "Transaction amount must be a valid number.",
    });
    return;
  }

  const inserted = await db
    .insert(transactions)
    .values({
      userId,
      type: type.trim(),
      description: description.trim(),
      amount: String(numericAmount),
      symbol: symbol ? symbol.toUpperCase().trim() : null,
    })
    .returning();

  const tx = inserted[0];

  if (!tx) {
    res.status(500).json({ error: "Failed to create transaction." });
    return;
  }

  res.status(201).json({
    id: tx.id,
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount),
    symbol: tx.symbol ?? null,
    createdAt: tx.createdAt.toISOString(),
  });
});

router.get("/watchlist", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));

  const symbols = rows.length
    ? rows.map((row: any) => row.symbol)
    : POPULAR_SYMBOLS.slice(0, 6);

  const quotes = symbols
    .map((symbol: string) => getQuote(symbol))
    .filter((quote: ReturnType<typeof getQuote>) => Boolean(quote));

  res.json(quotes);
});

router.post("/watchlist", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const body = AddToWatchlistBody.parse(req.body ?? {});
  const symbol = String(body.symbol ?? "").toUpperCase();

  if (!symbol) {
    res.status(400).json({ error: "Symbol is required" });
    return;
  }

  const meta = getMeta(symbol);

  if (!meta) {
    res.status(400).json({ error: "Unknown symbol" });
    return;
  }

  await db
    .insert(watchlist)
    .values({ userId, symbol })
    .onConflictDoNothing();

  const quote = getQuote(symbol);

  res.status(201).json(quote);
});

router.delete("/watchlist/:symbol", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const params = RemoveFromWatchlistParams.parse(req.params ?? {});
  const symbol = String(params.symbol ?? "").toUpperCase();

  if (!symbol) {
    res.status(400).json({ error: "Symbol is required" });
    return;
  }

  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)));

  res.status(204).end();
});

router.get("/dashboard", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const snapshot = await getAccountSnapshot(userId);
  const curve = getEquityCurve(snapshot.totalEquity, "1M");

  const change = Number((curve.endValue - curve.startValue).toFixed(2));

  const changePercent =
    curve.startValue > 0
      ? Number(((change / curve.startValue) * 100).toFixed(2))
      : 0;

  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));

  const positions = userHoldings
    .map((holding: any): Position | null => {
      const quote = getQuote(holding.symbol);
      const meta = getMeta(holding.symbol);

      if (!quote || !meta) return null;

      const quantity = Number(holding.quantity);
      const averageCost = Number(holding.averageCost);
      const marketValue = Number((quantity * quote.price).toFixed(2));

      const unrealizedPnl = Number(
        (quantity * (quote.price - averageCost)).toFixed(2),
      );

      const unrealizedPnlPercent =
        averageCost > 0
          ? Number(
              (((quote.price - averageCost) / averageCost) * 100).toFixed(2),
            )
          : 0;

      return {
        id: holding.id,
        symbol: holding.symbol,
        name: meta.name,
        sector: meta.sector,
        quantity,
        averageCost,
        currentPrice: quote.price,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        dayChange: Number((quantity * quote.change).toFixed(2)),
        dayChangePercent: quote.changePercent,
      };
    })
    .filter((position: Position | null): position is Position =>
      Boolean(position),
    );

  const watchRows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));

  const watchSymbols = watchRows.length
    ? watchRows.map((row: any) => row.symbol)
    : POPULAR_SYMBOLS.slice(0, 6);

  const watchQuotes = watchSymbols
    .map((symbol: string) => getQuote(symbol))
    .filter((quote: ReturnType<typeof getQuote>) => Boolean(quote));

  const recentOrderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(8);

  const recentOrders = recentOrderRows.map((order: any) => {
    const meta = getMeta(order.symbol);

    return {
      id: order.id,
      symbol: order.symbol,
      name: meta?.name ?? order.symbol,
      side: order.side as "buy" | "sell",
      quantity: Number(order.quantity),
      price: Number(order.price),
      total: Number(order.total),
      status: order.status as "filled" | "pending" | "rejected",
      createdAt: order.createdAt.toISOString(),
    };
  });

  const recentTransactionRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(8);

  const recentTransactions = recentTransactionRows.map((transaction: any) => ({
    id: transaction.id,
    type: transaction.type,
    description: transaction.description,
    amount: Number(transaction.amount),
    symbol: transaction.symbol ?? null,
    createdAt: transaction.createdAt.toISOString(),
  }));

  res.json({
    account: snapshot,
    equityCurve: {
      range: "1M",
      points: curve.points,
      startValue: curve.startValue,
      endValue: curve.endValue,
      change,
      changePercent,
    },
    positions,
    watchlist: watchQuotes,
    movers: getMovers(),
    indices: getIndices(),
    recentOrders,
    recentTransactions,
    news: getNews(),
  });
});

export default router;