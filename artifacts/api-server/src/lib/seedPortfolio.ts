import { db } from "../../../../lib/db/dist/index.js";
import {
  accounts,
  holdings,
  orders,
  transactions,
  watchlist,
} from "../../../../lib/db/dist/schema/index.js";
import { eq } from "drizzle-orm";
import { POPULAR_SYMBOLS, UNIVERSE, getQuote } from "./marketData";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = randInt(0, copy.length - 1);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;

type TxType = "deposit" | "buy" | "sell" | "dividend" | "fee";
type Side = "buy" | "sell";

interface SeedHolding {
  userId: string;
  symbol: string;
  quantity: string;
  averageCost: string;
}
interface SeedOrder {
  userId: string;
  symbol: string;
  side: Side;
  quantity: string;
  price: string;
  total: string;
  status: "filled";
  createdAt: Date;
}
interface SeedTx {
  userId: string;
  type: TxType;
  description: string;
  amount: string;
  symbol: string | null;
  createdAt: Date;
}
interface SeedWatch {
  userId: string;
  symbol: string;
}

interface SeedPlan {
  cashBalance: string;
  holdings: SeedHolding[];
  orders: SeedOrder[];
  transactions: SeedTx[];
  watchlist: SeedWatch[];
}

/**
 * Build (in memory only) a randomized starter portfolio for a user. No DB
 * writes happen here — callers persist atomically inside a transaction.
 */
function buildSeedPlan(userId: string): SeedPlan {
  // Working holdings the seeder will mutate (e.g. partial sell). Keyed by symbol.
  const workingHoldings: Map<
    string,
    { quantity: number; averageCost: number; createdAt: Date }
  > = new Map();
  const seedOrders: SeedOrder[] = [];
  const seedTxs: SeedTx[] = [];

  // 1. Pick 4-7 random tickers and create a buy + holding for each.
  const numHoldings = randInt(4, 7);
  const picked = pickRandom(POPULAR_SYMBOLS, numHoldings);
  let totalSpentOnBuys = 0;

  for (const symbol of picked) {
    const quote = getQuote(symbol);
    if (!quote) continue;
    const meta = UNIVERSE.find((u) => u.symbol === symbol);
    if (!meta) continue;

    const targetSpend = rand(2000, 12000);
    const qty = Math.max(1, Math.round(targetSpend / quote.price));
    const avgCost = +(quote.price * rand(0.85, 1.15)).toFixed(2);
    const total = +(qty * avgCost).toFixed(2);
    const daysAgo = randInt(7, 85);
    const createdAt = new Date(Date.now() - daysAgo * DAY_MS);

    workingHoldings.set(symbol, { quantity: qty, averageCost: avgCost, createdAt });
    seedOrders.push({
      userId,
      symbol,
      side: "buy",
      quantity: qty.toFixed(6),
      price: avgCost.toFixed(4),
      total: total.toFixed(2),
      status: "filled",
      createdAt,
    });
    seedTxs.push({
      userId,
      type: "buy",
      description: `Bought ${qty} ${symbol} @ $${avgCost.toFixed(2)}`,
      amount: (-total).toFixed(2),
      symbol,
      createdAt,
    });
    totalSpentOnBuys += total;
  }

  // 2. Opening deposit, sized to cover all buys plus some leftover cash.
  const cashOnHand = +rand(8000, 60000).toFixed(2);
  const initialDeposit = +(totalSpentOnBuys + cashOnHand).toFixed(2);
  const depositDate = new Date(Date.now() - 90 * DAY_MS);
  seedTxs.push({
    userId,
    type: "deposit",
    description: "Opening account funding",
    amount: initialDeposit.toFixed(2),
    symbol: null,
    createdAt: depositDate,
  });

  let runningCash = initialDeposit - totalSpentOnBuys;

  // 3. 1-2 dividend payouts on held symbols.
  const heldSymbols = Array.from(workingHoldings.keys());
  if (heldSymbols.length > 0) {
    const divCount = randInt(1, 2);
    for (let i = 0; i < divCount; i++) {
      const sym = heldSymbols[randInt(0, heldSymbols.length - 1)];
      const amt = +rand(4, 65).toFixed(2);
      seedTxs.push({
        userId,
        type: "dividend",
        description: `${sym} dividend payout`,
        amount: amt.toFixed(2),
        symbol: sym,
        createdAt: new Date(Date.now() - randInt(2, 40) * DAY_MS),
      });
      runningCash += amt;
    }

    // 4. Optional partial sell — actually decrements the corresponding holding.
    if (Math.random() > 0.5) {
      const sym = heldSymbols[randInt(0, heldSymbols.length - 1)];
      const holding = workingHoldings.get(sym)!;
      const q = getQuote(sym);
      if (q && holding.quantity > 1) {
        const sellQty = Math.max(1, Math.floor(holding.quantity * rand(0.1, 0.3)));
        if (sellQty < holding.quantity) {
          const sellPrice = +(q.price * rand(0.96, 1.04)).toFixed(2);
          const proceeds = +(sellQty * sellPrice).toFixed(2);
          const when = new Date(Date.now() - randInt(2, 30) * DAY_MS);

          // Decrement the working holding so post-seed state is consistent.
          holding.quantity -= sellQty;

          seedOrders.push({
            userId,
            symbol: sym,
            side: "sell",
            quantity: sellQty.toFixed(6),
            price: sellPrice.toFixed(4),
            total: proceeds.toFixed(2),
            status: "filled",
            createdAt: when,
          });
          seedTxs.push({
            userId,
            type: "sell",
            description: `Sold ${sellQty} ${sym} @ $${sellPrice.toFixed(2)}`,
            amount: proceeds.toFixed(2),
            symbol: sym,
            createdAt: when,
          });
          runningCash += proceeds;
        }
      }
    }

    // 5. One small maintenance fee.
    const feeAmt = +rand(0.5, 4).toFixed(2);
    seedTxs.push({
      userId,
      type: "fee",
      description: "Account maintenance fee",
      amount: (-feeAmt).toFixed(2),
      symbol: null,
      createdAt: new Date(Date.now() - randInt(5, 50) * DAY_MS),
    });
    runningCash -= feeAmt;
  }

  // 6. Build holdings rows from the (possibly mutated) working set.
  const holdingsRows: SeedHolding[] = [];
  for (const [symbol, h] of workingHoldings.entries()) {
    if (h.quantity <= 0) continue;
    holdingsRows.push({
      userId,
      symbol,
      quantity: h.quantity.toFixed(6),
      averageCost: h.averageCost.toFixed(4),
    });
  }

  // 7. Watchlist of symbols not in the portfolio.
  const heldSet = new Set(picked);
  const watchPool = POPULAR_SYMBOLS.filter((s) => !heldSet.has(s));
  const watchPicks = pickRandom(watchPool, randInt(3, 5));
  const watchlistRows: SeedWatch[] = watchPicks.map((symbol) => ({ userId, symbol }));

  // 8. Floor cash so a brand-new user never starts cashless.
  if (runningCash < 500) {
    runningCash = 500 + +rand(0, 1500).toFixed(2);
  }

  return {
    cashBalance: runningCash.toFixed(2),
    holdings: holdingsRows,
    orders: seedOrders,
    transactions: seedTxs,
    watchlist: watchlistRows,
  };
}

/**
 * Atomically create a brand-new account for `userId` and seed it with a
 * randomized starter portfolio. Returns the existing account if one is
 * already present (no re-seeding). Concurrent first-creation calls are
 * safe: only one will perform the seed; the other returns the persisted
 * row without writing extra rows.
 */
export async function createAccountWithSeed(
  userId: string,
  displayName: string,
) {
 return db.transaction(async (tx: any) => {
    const existing = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);
    if (existing[0]) return existing[0];

    const plan = buildSeedPlan(userId);

    const insertedAccounts = await tx
      .insert(accounts)
      .values({
        userId,
        displayName,
        cashBalance: plan.cashBalance,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedAccounts.length === 0) {
      // A concurrent transaction won the race; fetch and return that row.
      const [existingAfterRace] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(1);
      return existingAfterRace;
    }

    if (plan.holdings.length > 0) {
      await tx.insert(holdings).values(plan.holdings);
    }
    if (plan.orders.length > 0) {
      await tx.insert(orders).values(plan.orders);
    }
    if (plan.transactions.length > 0) {
      await tx.insert(transactions).values(plan.transactions);
    }
    if (plan.watchlist.length > 0) {
      await tx.insert(watchlist).values(plan.watchlist).onConflictDoNothing();
    }

    return insertedAccounts[0];
  });
}
