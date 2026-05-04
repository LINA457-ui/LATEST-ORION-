import express from "express";
import { db } from "@workspace/db";
import { accounts, holdings, orders, transactions } from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, ensureAccount, userIdOf } from "../lib/auth.js";
import { getMeta, getQuote } from "../lib/marketData.js";

const router: any = express.Router();

const PlaceOrderBody = {
  parse(data: any) {
    return data ?? {};
  },
};

router.use(requireAuth);

router.get("/orders", async (req: any, res: any) => {
  const userId = userIdOf(req);

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  res.json(
    rows.map((o: any) => {
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
    }),
  );
});

router.post("/orders", async (req: any, res: any) => {
  const userId = userIdOf(req);
  const body = PlaceOrderBody.parse(req.body);

  const symbol = String(body.symbol ?? "").toUpperCase();
  const side = body.side === "sell" ? "sell" : "buy";
  const quantity = Number(body.quantity);

  if (!symbol) {
    res.status(400).json({ error: "Symbol is required" });
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    res.status(400).json({ error: "Quantity must be positive" });
    return;
  }

  const meta = getMeta(symbol);
  const quote = getQuote(symbol);

  if (!meta || !quote) {
    res.status(400).json({ error: "Unknown symbol" });
    return;
  }

  const account = await ensureAccount(userId);

  if (account?.isSuspended) {
    res.status(403).json({ error: "Account suspended. Trading disabled." });
    return;
  }

  const price = quote.price;
  const total = Number((price * quantity).toFixed(2));

  if (side === "buy") {
    const cash = Number(account.cashBalance);

    if (cash < total) {
      res.status(400).json({ error: "Insufficient buying power" });
      return;
    }

    await db
      .update(accounts)
      .set({ cashBalance: sql`${accounts.cashBalance} - ${total}` })
      .where(eq(accounts.userId, userId));

    const existing = (
      await db
        .select()
        .from(holdings)
        .where(and(eq(holdings.userId, userId), eq(holdings.symbol, symbol)))
        .limit(1)
    )[0];

    if (existing) {
      const prevQty = Number(existing.quantity);
      const prevAvg = Number(existing.averageCost);
      const newQty = prevQty + quantity;

      const newAvg =
        newQty > 0 ? (prevAvg * prevQty + price * quantity) / newQty : 0;

      await db
        .update(holdings)
        .set({
          quantity: newQty.toFixed(6),
          averageCost: newAvg.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(holdings.id, existing.id));
    } else {
      await db.insert(holdings).values({
        userId,
        symbol,
        quantity: quantity.toFixed(6),
        averageCost: price.toFixed(4),
      });
    }
  } else {
    const existing = (
      await db
        .select()
        .from(holdings)
        .where(and(eq(holdings.userId, userId), eq(holdings.symbol, symbol)))
        .limit(1)
    )[0];

    const prevQty = existing ? Number(existing.quantity) : 0;

    if (!existing || prevQty < quantity) {
      res.status(400).json({ error: "Insufficient shares to sell" });
      return;
    }

    const newQty = prevQty - quantity;

    if (newQty <= 0) {
      await db.delete(holdings).where(eq(holdings.id, existing.id));
    } else {
      await db
        .update(holdings)
        .set({
          quantity: newQty.toFixed(6),
          updatedAt: new Date(),
        })
        .where(eq(holdings.id, existing.id));
    }

    await db
      .update(accounts)
      .set({ cashBalance: sql`${accounts.cashBalance} + ${total}` })
      .where(eq(accounts.userId, userId));
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      symbol,
      side,
      quantity: quantity.toFixed(6),
      price: price.toFixed(4),
      total: total.toFixed(2),
      status: "filled",
    })
    .returning();

  if (!order) {
    res.status(500).json({ error: "Failed to create order." });
    return;
  }

  await db.insert(transactions).values({
    userId,
    type: side,
    description: `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol} @ $${price.toFixed(2)}`,
    amount: (side === "buy" ? -total : total).toFixed(2),
    symbol,
  });

  res.status(201).json({
    id: order.id,
    symbol,
    name: meta.name,
    side,
    quantity,
    price,
    total,
    status: "filled",
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;