import { Router, type IRouter, type Response } from "express";
import {
  GetQuoteParams,
  GetSymbolChartParams,
  GetSymbolChartQueryParams,
  ListQuotesQueryParams,
} from "../../../../lib/api-zod/dist/index.js";
import {
  getAllQuotes,
  getChart,
  getIndices,
  getMovers,
  getNews,
  getQuote,
  getQuoteDetail,
  type Range,
} from "../lib/marketData";

const router: IRouter = Router();

router.get("/quotes", (req, res: Response) => {
  const parsed = ListQuotesQueryParams.parse(req.query);
  if (parsed.symbols) {
    const symbols = parsed.symbols
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const quotes = symbols
      .map((s) => getQuote(s))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));
    res.json(quotes);
    return;
  }
  res.json(getAllQuotes());
});

router.get("/movers", (_req, res: Response) => {
  res.json(getMovers());
});

router.get("/indices", (_req, res: Response) => {
  res.json(getIndices());
});

router.get("/news", (_req, res: Response) => {
  res.json(getNews());
});

router.get("/quote/:symbol", (req, res: Response) => {
  const params = GetQuoteParams.parse(req.params);
  const detail = getQuoteDetail(params.symbol);
  if (!detail) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }
  res.json(detail);
});

router.get("/chart/:symbol", (req, res: Response) => {
  const params = GetSymbolChartParams.parse(req.params);
  const query = GetSymbolChartQueryParams.parse(req.query);
  const range = (query.range ?? "1D") as Range;
  const candles = getChart(params.symbol.toUpperCase(), range);
  if (!candles.length) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }
  res.json({ symbol: params.symbol.toUpperCase(), range, candles });
});

export default router;
