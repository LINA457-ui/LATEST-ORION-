import { Router, type IRouter, type Response } from "express";
import { db } from "../../../../lib/db/dist/index.js";
import { holdings } from "../../../../lib/db/dist/schema/index.js";
import { eq } from "drizzle-orm";
import { requireAuth, userIdOf } from "../lib/auth";
import { getMeta, getQuote } from "../lib/marketData";

const router: IRouter = Router();

type AnyRow = any;

router.use(requireAuth);

router.get("/positions", async (req, res: Response) => {
  const userId = userIdOf(req);

  const rows = (await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId))) as AnyRow[];

  const positions = rows
    .map((h: AnyRow) => {
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
    .filter((p: any): p is NonNullable<typeof p> => Boolean(p));

  res.json(positions);
});

router.get("/allocation", async (req, res: Response) => {
  const userId = userIdOf(req);

  const rows = (await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId))) as AnyRow[];

  const sectorTotals = new Map<string, number>();
  const assetTotals = new Map<string, number>();

  let total = 0;

  for (const h of rows) {
    const q = getQuote(h.symbol);
    const meta = getMeta(h.symbol);

    if (!q || !meta) continue;

    const value = Number(h.quantity) * q.price;
    total += value;

    sectorTotals.set(meta.sector, (sectorTotals.get(meta.sector) ?? 0) + value);
    assetTotals.set(meta.symbol, (assetTotals.get(meta.symbol) ?? 0) + value);
  }

  const toSlices = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([label, value]: [string, number]) => ({
        label,
        value: +value.toFixed(2),
        percent: total > 0 ? +((value / total) * 100).toFixed(2) : 0,
      }))
      .sort((a: any, b: any) => b.value - a.value);

  res.json({
    bySector: toSlices(sectorTotals),
    byAsset: toSlices(assetTotals),
  });
});

export default router;