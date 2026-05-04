import { db } from "@workspace/db";
import { accounts, holdings, orders, transactions, watchlist, } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { POPULAR_SYMBOLS, UNIVERSE, getQuote } from "./marketData.js";
function rand(min, max) {
    return Math.random() * (max - min) + min;
}
function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}
function pickRandom(arr, n) {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length > 0) {
        const i = randInt(0, copy.length - 1);
        const picked = copy.splice(i, 1)[0];
        if (picked !== undefined) {
            out.push(picked);
        }
    }
    return out;
}
const DAY_MS = 24 * 60 * 60 * 1000;
function buildSeedPlan(userId) {
    const workingHoldings = new Map();
    const seedOrders = [];
    const seedTxs = [];
    const numHoldings = randInt(4, 7);
    const picked = pickRandom(POPULAR_SYMBOLS, numHoldings);
    let totalSpentOnBuys = 0;
    for (const symbol of picked) {
        const quote = getQuote(symbol);
        if (!quote)
            continue;
        const meta = UNIVERSE.find((u) => u.symbol === symbol);
        if (!meta)
            continue;
        const targetSpend = rand(2000, 12000);
        const qty = Math.max(1, Math.round(targetSpend / quote.price));
        const avgCost = +(quote.price * rand(0.85, 1.15)).toFixed(2);
        const total = +(qty * avgCost).toFixed(2);
        const daysAgo = randInt(7, 85);
        const createdAt = new Date(Date.now() - daysAgo * DAY_MS);
        workingHoldings.set(symbol, {
            quantity: qty,
            averageCost: avgCost,
            createdAt,
        });
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
    const heldSymbols = Array.from(workingHoldings.keys());
    if (heldSymbols.length > 0) {
        const divCount = randInt(1, 2);
        for (let i = 0; i < divCount; i++) {
            const sym = heldSymbols[randInt(0, heldSymbols.length - 1)];
            if (!sym)
                continue;
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
        if (Math.random() > 0.5) {
            const sym = heldSymbols[randInt(0, heldSymbols.length - 1)];
            if (sym) {
                const holding = workingHoldings.get(sym);
                const q = getQuote(sym);
                if (q && holding && holding.quantity > 1) {
                    const sellQty = Math.max(1, Math.floor(holding.quantity * rand(0.1, 0.3)));
                    if (sellQty < holding.quantity) {
                        const sellPrice = +(q.price * rand(0.96, 1.04)).toFixed(2);
                        const proceeds = +(sellQty * sellPrice).toFixed(2);
                        const when = new Date(Date.now() - randInt(2, 30) * DAY_MS);
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
        }
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
    const holdingsRows = [];
    for (const [symbol, h] of workingHoldings.entries()) {
        if (h.quantity <= 0)
            continue;
        holdingsRows.push({
            userId,
            symbol,
            quantity: h.quantity.toFixed(6),
            averageCost: h.averageCost.toFixed(4),
        });
    }
    const heldSet = new Set(picked);
    const watchPool = POPULAR_SYMBOLS.filter((symbol) => !heldSet.has(symbol));
    const watchPicks = pickRandom(watchPool, randInt(3, 5));
    const watchlistRows = watchPicks.map((symbol) => ({
        userId,
        symbol,
    }));
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
export async function createAccountWithSeed(userId, displayName) {
    return db.transaction(async (tx) => {
        const existing = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.userId, userId))
            .limit(1);
        if (existing[0])
            return existing[0];
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
