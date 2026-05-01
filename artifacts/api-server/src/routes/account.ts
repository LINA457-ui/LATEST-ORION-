import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { accounts, holdings, orders, transactions, watchlist } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  AddToWatchlistBody,
  RemoveFromWatchlistParams,
  GetAccountPerformanceQueryParams,
} from "@workspace/api-zod";
import { requireAuth, ensureAccount, userIdOf } from "../lib/auth";
import {
  getAllQuotes,
  getEquityCurve,
  getIndices,
  getMeta,
  getMovers,
  getNews,
  getQuote,
  POPULAR_SYMBOLS,
  type Range,
} from "../lib/marketData";

const router = Router();
router.use(requireAuth);

async function getAccountSnapshot(userId: string) {
  const account = await ensureAccount(userId);
  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));

  let portfolioValue = 0;
  let dayChange = 0;
  for (const h of userHoldings) {
    const q = getQuote(h.symbol);
    if (!q) continue;
    const qty = Number(h.quantity);
    portfolioValue += qty * q.price;
    dayChange += qty * q.change;
  }
  const cashBalance = Number(account.cashBalance);
  const computedPortfolioValue = +portfolioValue.toFixed(2);
  const computedTotalEquity = +(portfolioValue + cashBalance).toFixed(2);
  const computedDayChange = +dayChange.toFixed(2);
  const previousValue = computedTotalEquity - computedDayChange;
  const computedDayChangePercent =
    previousValue > 0 ? +((computedDayChange / previousValue) * 100).toFixed(2) : 0;

  // Admin-set display overrides (when present) take precedence over computed
  // figures so the dashboard stays stable regardless of market simulator state.
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
    displayName: account.displayName,
    avatarUrl: account.avatarUrl ?? null,
    cashBalance,
    totalEquity: totalEquityDisplay,
    portfolioValue: portfolioValueDisplay,
    dayChange: dayChangeDisplay,
    dayChangePercent: dayChangePercentDisplay,
    buyingPower: buyingPowerDisplay,
    // Aliases — the admin endpoint and some clients prefer the `displayed*`
    // naming. Both names resolve to the same override-aware value.
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

router.get("/me", async (req: Request, res: Response) => {
  const userId = userIdOf(req);
  const snapshot = await getAccountSnapshot(userId);
  res.json(snapshot);
});

router.post("/sync", async (req: Request, res: Response) => {
  const userId = userIdOf(req);
  const { email, displayName } = (req.body ?? {}) as {
    email?: string;
    displayName?: string;
  };
  await ensureAccount(userId, displayName, email);
  res.json({ ok: true });
});

// Upload (or clear) the user's avatar. The client should resize/compress to
// a small JPEG and send a data URL — we cap the payload at ~600KB so bulk
// uploads cannot bloat the database.
router.post("/avatar", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const { avatarUrl } = (req.body ?? {}) as { avatarUrl?: string | null };
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
  // Restrict to base64-encoded JPEG / PNG / WEBP data URLs. Reject any other
  // schemes (incl. http(s), javascript:, data:text/html, etc.) so we don't
  // store anything that the browser might render unexpectedly.
  const dataUrlRe = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  if (!dataUrlRe.test(avatarUrl)) {
    res.status(400).json({
      error: "Avatar must be a base64-encoded JPEG, PNG, or WEBP data URL.",
    });
    return;
  }
  if (avatarUrl.length > 600_000) {
    res.status(413).json({ error: "Image too large. Please upload a smaller picture." });
    return;
  }
  await ensureAccount(userId);
  await db
    .update(accounts)
    .set({ avatarUrl })
    .where(eq(accounts.userId, userId));
  res.json({ ok: true, avatarUrl });
});

router.get("/performance", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const parsed = GetAccountPerformanceQueryParams.parse(req.query);
  const range = (parsed.range ?? "1M") as Range;
  const snap = await getAccountSnapshot(userId);
  const curve = getEquityCurve(snap.totalEquity, range);
  const change = +(curve.endValue - curve.startValue).toFixed(2);
  const changePercent =
    curve.startValue > 0 ? +((change / curve.startValue) * 100).toFixed(2) : 0;
  res.json({
    range,
    points: curve.points,
    startValue: curve.startValue,
    endValue: curve.endValue,
    change,
    changePercent,
  });
});

router.get("/transactions", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(100);
  res.json(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      symbol: t.symbol ?? undefined,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

router.get("/watchlist", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));
  const symbols = rows.length ? rows.map((r) => r.symbol) : POPULAR_SYMBOLS.slice(0, 6);
  const quotes = symbols
    .map((s) => getQuote(s))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));
  res.json(quotes);
});

router.post("/watchlist", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const body = AddToWatchlistBody.parse(req.body);
  const symbol = body.symbol.toUpperCase();
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

router.delete("/watchlist/:symbol", async (req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const params = RemoveFromWatchlistParams.parse(req.params);
  await db
    .delete(watchlist)
    .where(
      and(eq(watchlist.userId, userId), eq(watchlist.symbol, params.symbol.toUpperCase())),
    );
  res.status(204).end();
});

router.get("/dashboard", async(req: Request, res: Response)=> {
  const userId = userIdOf(req);
  const snapshot = await getAccountSnapshot(userId);
  const curve = getEquityCurve(snapshot.totalEquity, "1M");
  const change = +(curve.endValue - curve.startValue).toFixed(2);
  const changePercent =
    curve.startValue > 0 ? +((change / curve.startValue) * 100).toFixed(2) : 0;

  const userHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId));
  const positions = userHoldings
    .map((h) => {
      const q = getQuote(h.symbol);
      const meta = getMeta(h.symbol);
      if (!q || !meta) return null;
      const qty = Number(h.quantity);
      const avg = Number(h.averageCost);
      const marketValue = +(qty * q.price).toFixed(2);
      const unrealizedPnl = +(qty * (q.price - avg)).toFixed(2);
      const unrealizedPnlPercent =
        avg > 0 ? +(((q.price - avg) / avg) * 100).toFixed(2) : 0;
      return {
        id: h.id,
        symbol: h.symbol,
        name: meta.name,
        sector: meta.sector,
        quantity: qty,
        averageCost: avg,
        currentPrice: q.price,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        dayChange: +(qty * q.change).toFixed(2),
        dayChangePercent: q.changePercent,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const watchRows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));
  const watchSymbols = watchRows.length
    ? watchRows.map((r) => r.symbol)
    : POPULAR_SYMBOLS.slice(0, 6);
  const watchQuotes = watchSymbols
    .map((s) => getQuote(s))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const recentOrders = (
    await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(8)
  ).map((o) => {
    const meta = getMeta(o.symbol);
    return {
      id: o.id,
      symbol: o.symbol,
      name: meta?.name ?? o.symbol,
      side: o.side as "buy" | "sell",
      quantity: Number(o.quantity),
      price: Number(o.price),
      total: Number(o.total),
      status: o.status as "filled" | "pending" | "rejected",
      createdAt: o.createdAt.toISOString(),
    };
  });

  const recentTransactions = (
    await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(8)
  ).map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    symbol: t.symbol ?? undefined,
    createdAt: t.createdAt.toISOString(),
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
export { getAccountSnapshot };
