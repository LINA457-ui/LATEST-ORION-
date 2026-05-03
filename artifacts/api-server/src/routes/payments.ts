import { Router, type IRouter, type Response } from "express";
import { db } from "../../../../lib/db/dist/index.js";
import { accounts, transactions } from "../../../../lib/db/dist/schema/index.js";
import {
  ConfirmDepositBody,
  CreateDepositCheckoutBody,
} from "../../../../lib/api-zod/dist/index.js";
import { eq, sql } from "drizzle-orm";

import { requireAuth, ensureAccount, userIdOf } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

let stripeClient: any = null;
async function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = (await import("stripe")).default;
  stripeClient = new Stripe(key);
  return stripeClient;
}

router.post("/deposit", async (req, res: Response) => {
  const userId = userIdOf(req);
  const body = CreateDepositCheckoutBody.parse(req.body);
  if (body.amount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }
  await ensureAccount(userId);

  const stripe = await getStripe();
  const origin = req.get("origin") || `https://${req.get("host")}`;
  const successUrl = `${origin}${req.baseUrl.replace(/\/api\/payments$/, "")}/funding/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}${req.baseUrl.replace(/\/api\/payments$/, "")}/funding`;

  if (!stripe) {
    res.status(503).json({
      error:
        "Stripe is not configured yet. Add the Stripe integration to enable account funding.",
    });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Orion brokerage deposit" },
          unit_amount: Math.round(body.amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, kind: "deposit" },
  });

  res.json({ url: session.url ?? "", sessionId: session.id });
});

router.post("/confirm", async (req, res: Response) => {
  const userId = userIdOf(req);
  const body = ConfirmDepositBody.parse(req.body);
  const stripe = await getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }
  const session = await stripe.checkout.sessions.retrieve(body.sessionId);
  if (session.payment_status !== "paid") {
    res.status(400).json({ error: "Payment not completed" });
    return;
  }
  if (session.metadata?.userId !== userId) {
    res.status(403).json({ error: "Session does not belong to this user" });
    return;
  }
  const amount = (session.amount_total ?? 0) / 100;
  await db
    .update(accounts)
    .set({ cashBalance: sql`${accounts.cashBalance} + ${amount}` })
    .where(eq(accounts.userId, userId));
  await db.insert(transactions).values({
    userId,
    type: "deposit",
    description: `Deposit via Stripe • ${session.id.slice(-8)}`,
    amount: amount.toFixed(2),
  });
  const account = (
    await db.select().from(accounts).where(eq(accounts.userId, userId))
  )[0]!;
  res.json({
    userId,
    displayName: account.displayName,
    cashBalance: Number(account.cashBalance),
    totalEquity: Number(account.cashBalance),
    portfolioValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    buyingPower: Number(account.cashBalance),
  });
});

export default router;
