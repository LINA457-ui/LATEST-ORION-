import express from "express";
import { getAllQuotes, getChart, getIndices, getMovers, getNews, getQuote, getQuoteDetail, } from "../lib/marketData.js";
const router = express.Router();
const ListQuotesQueryParams = {
    parse(data) {
        return data ?? {};
    },
};
const GetQuoteParams = {
    parse(data) {
        return data ?? {};
    },
};
const GetSymbolChartParams = {
    parse(data) {
        return data ?? {};
    },
};
const GetSymbolChartQueryParams = {
    parse(data) {
        return data ?? {};
    },
};
router.get("/quotes", (req, res) => {
    const parsed = ListQuotesQueryParams.parse(req.query);
    if (parsed.symbols) {
        const symbols = String(parsed.symbols)
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
        const quotes = symbols
            .map((s) => getQuote(s))
            .filter((q) => Boolean(q));
        res.json(quotes);
        return;
    }
    res.json(getAllQuotes());
});
router.get("/movers", (_req, res) => {
    res.json(getMovers());
});
router.get("/indices", (_req, res) => {
    res.json(getIndices());
});
router.get("/news", (_req, res) => {
    res.json(getNews());
});
router.get("/quote/:symbol", (req, res) => {
    const params = GetQuoteParams.parse(req.params);
    const symbol = String(params.symbol ?? "").toUpperCase();
    const detail = getQuoteDetail(symbol);
    if (!detail) {
        res.status(404).json({ error: "Symbol not found" });
        return;
    }
    res.json(detail);
});
router.get("/chart/:symbol", (req, res) => {
    const params = GetSymbolChartParams.parse(req.params);
    const query = GetSymbolChartQueryParams.parse(req.query);
    const symbol = String(params.symbol ?? "").toUpperCase();
    const range = (query.range ?? "1D");
    const candles = getChart(symbol, range);
    if (!candles.length) {
        res.status(404).json({ error: "Symbol not found" });
        return;
    }
    res.json({ symbol, range, candles });
});
export default router;
