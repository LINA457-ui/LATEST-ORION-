import express from "express";
import {
  getAllQuotes,
  getChart,
  getIndices,
  getMovers,
  getNews,
  getQuote,
  getQuoteDetail,
  type Range,
} from "../lib/marketData.js";

const router: any = express.Router();

const ListQuotesQueryParams = {
  parse(data: any) {
    return data ?? {};
  },
};

const GetQuoteParams = {
  parse(data: any) {
    return data ?? {};
  },
};

const GetSymbolChartParams = {
  parse(data: any) {
    return data ?? {};
  },
};

const GetSymbolChartQueryParams = {
  parse(data: any) {
    return data ?? {};
  },
};

router.get("/quotes", (req: any, res: any) => {
  const parsed = ListQuotesQueryParams.parse(req.query);

  if (parsed.symbols) {
    const symbols = String(parsed.symbols)
      .split(",")
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);

    const quotes = symbols
      .map((s: string) => getQuote(s))
      .filter((q: ReturnType<typeof getQuote>) => Boolean(q));

    res.json(quotes);
    return;
  }

  res.json(getAllQuotes());
});

router.get("/movers", (_req: any, res: any) => {
  res.json(getMovers());
});

router.get("/indices", (_req: any, res: any) => {
  res.json(getIndices());
});

router.get("/news", (_req: any, res: any) => {
  res.json(getNews());
});

router.get("/quote/:symbol", (req: any, res: any) => {
  const params = GetQuoteParams.parse(req.params);
  const symbol = String(params.symbol ?? "").toUpperCase();

  const detail = getQuoteDetail(symbol);

  if (!detail) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }

  res.json(detail);
});

router.get("/chart/:symbol", (req: any, res: any) => {
  const params = GetSymbolChartParams.parse(req.params);
  const query = GetSymbolChartQueryParams.parse(req.query);

  const symbol = String(params.symbol ?? "").toUpperCase();
  const range = (query.range ?? "1D") as Range;

  const candles = getChart(symbol, range);

  if (!candles.length) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }

  res.json({ symbol, range, candles });
});

export default router;