// Seed sample data for the demo "guest" user. Idempotent.
// Usage: node scripts/seed.mjs
import pg from "pg";

const { Client } = pg;

const DEMO_USER = "demo-user";

const HOLDINGS = [
  { symbol: "AAPL", quantity: 25, averageCost: 198.42 },
  { symbol: "NVDA", quantity: 40, averageCost: 118.74 },
  { symbol: "MSFT", quantity: 12, averageCost: 412.81 },
];
const WATCHLIST = ["TSLA", "GOOGL", "AMZN", "META", "JPM", "BRK.B"];
const TRANSACTIONS = [
  { type: "deposit", description: "Initial brokerage deposit", amount: 100000, symbol: null },
  { type: "buy", description: "Bought 25 AAPL @ $198.42", amount: -4960.5, symbol: "AAPL" },
  { type: "buy", description: "Bought 40 NVDA @ $118.74", amount: -4749.6, symbol: "NVDA" },
  { type: "buy", description: "Bought 12 MSFT @ $412.81", amount: -4953.72, symbol: "MSFT" },
  { type: "dividend", description: "Quarterly dividend - AAPL", amount: 6.25, symbol: "AAPL" },
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Ensure account exists (cash balance reduced to reflect purchases ~ 100k - 14.6k)
    const cashAfterBuys = 100000 - 4960.5 - 4749.6 - 4953.72 + 6.25;
    await client.query(
      `INSERT INTO accounts (user_id, display_name, cash_balance) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET cash_balance = EXCLUDED.cash_balance`,
      [DEMO_USER, "Demo Investor", cashAfterBuys.toFixed(2)],
    );

    for (const h of HOLDINGS) {
      await client.query(
        `INSERT INTO holdings (user_id, symbol, quantity, average_cost)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, symbol) DO UPDATE
         SET quantity = EXCLUDED.quantity, average_cost = EXCLUDED.average_cost, updated_at = now()`,
        [DEMO_USER, h.symbol, h.quantity.toFixed(6), h.averageCost.toFixed(4)],
      );
    }

    for (const symbol of WATCHLIST) {
      await client.query(
        `INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2)
         ON CONFLICT (user_id, symbol) DO NOTHING`,
        [DEMO_USER, symbol],
      );
    }

    const { rowCount } = await client.query(
      `SELECT 1 FROM transactions WHERE user_id = $1 LIMIT 1`,
      [DEMO_USER],
    );
    if (!rowCount) {
      for (const t of TRANSACTIONS) {
        await client.query(
          `INSERT INTO transactions (user_id, type, description, amount, symbol)
           VALUES ($1, $2, $3, $4, $5)`,
          [DEMO_USER, t.type, t.description, t.amount.toFixed(2), t.symbol],
        );
      }
    }

    console.log("Seed complete for", DEMO_USER);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
