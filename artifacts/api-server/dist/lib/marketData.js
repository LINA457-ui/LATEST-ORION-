// Deterministic-but-lively simulated market data. No external API needed.
// Prices oscillate around a base using a sine wave seeded from time + symbol.
export const UNIVERSE = [
    {
        symbol: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        base: 234.12,
        description: "Apple Inc. designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories worldwide.",
        marketCap: 3580,
        peRatio: 33.4,
        dividendYield: 0.43,
        yearHigh: 260.1,
        yearLow: 164.08,
    },
    {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        sector: "Technology",
        base: 432.18,
        description: "Microsoft develops, licenses, and supports software, services, devices, and solutions worldwide.",
        marketCap: 3210,
        peRatio: 35.7,
        dividendYield: 0.71,
        yearHigh: 470.2,
        yearLow: 309.45,
    },
    {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        sector: "Semiconductors",
        base: 142.66,
        description: "NVIDIA provides graphics, compute and networking solutions powering AI, gaming and data center workloads.",
        marketCap: 3490,
        peRatio: 64.2,
        dividendYield: 0.03,
        yearHigh: 168.4,
        yearLow: 39.23,
    },
    {
        symbol: "AMZN",
        name: "Amazon.com, Inc.",
        sector: "Consumer Discretionary",
        base: 198.24,
        description: "Amazon engages in retail sale of consumer products, advertising and subscriptions services through online and physical stores.",
        marketCap: 2080,
        peRatio: 47.1,
        dividendYield: 0,
        yearHigh: 215.9,
        yearLow: 118.35,
    },
    {
        symbol: "GOOGL",
        name: "Alphabet Inc. Class A",
        sector: "Communication Services",
        base: 178.52,
        description: "Alphabet provides web-based search, advertisements, maps, software applications, mobile operating systems and consumer content.",
        marketCap: 2160,
        peRatio: 24.9,
        dividendYield: 0.45,
        yearHigh: 195.3,
        yearLow: 127.9,
    },
    {
        symbol: "META",
        name: "Meta Platforms, Inc.",
        sector: "Communication Services",
        base: 568.91,
        description: "Meta builds technology that helps people connect through Facebook, Instagram, WhatsApp and Reality Labs.",
        marketCap: 1450,
        peRatio: 27.3,
        dividendYield: 0.36,
        yearHigh: 638.4,
        yearLow: 274.3,
    },
    {
        symbol: "TSLA",
        name: "Tesla, Inc.",
        sector: "Consumer Discretionary",
        base: 248.5,
        description: "Tesla designs, develops, manufactures, leases and sells electric vehicles, energy generation and storage systems.",
        marketCap: 790,
        peRatio: 71.2,
        dividendYield: 0,
        yearHigh: 299.3,
        yearLow: 138.8,
    },
    {
        symbol: "BRK.B",
        name: "Berkshire Hathaway Inc. Class B",
        sector: "Financial Services",
        base: 478.32,
        description: "Berkshire Hathaway is a holding company owning subsidiaries engaged in insurance, freight rail, energy, manufacturing and retail.",
        marketCap: 1030,
        peRatio: 9.4,
        dividendYield: 0,
        yearHigh: 491.6,
        yearLow: 359.6,
    },
    {
        symbol: "JPM",
        name: "JPMorgan Chase & Co.",
        sector: "Financial Services",
        base: 232.84,
        description: "JPMorgan Chase is a leading global financial services firm providing investment banking, financial services, asset management and treasury services.",
        marketCap: 660,
        peRatio: 12.1,
        dividendYield: 2.1,
        yearHigh: 248.5,
        yearLow: 169.5,
    },
    {
        symbol: "V",
        name: "Visa Inc.",
        sector: "Financial Services",
        base: 311.4,
        description: "Visa operates as a payments technology company connecting consumers, merchants and financial institutions worldwide.",
        marketCap: 612,
        peRatio: 30.5,
        dividendYield: 0.69,
        yearHigh: 328.6,
        yearLow: 246.2,
    },
    {
        symbol: "JNJ",
        name: "Johnson & Johnson",
        sector: "Healthcare",
        base: 156.21,
        description: "Johnson & Johnson researches, develops, manufactures and sells pharmaceutical and medical device products globally.",
        marketCap: 376,
        peRatio: 24.8,
        dividendYield: 3.21,
        yearHigh: 168.85,
        yearLow: 143.13,
    },
    {
        symbol: "WMT",
        name: "Walmart Inc.",
        sector: "Consumer Staples",
        base: 92.78,
        description: "Walmart engages in the operation of retail, wholesale and other units worldwide, including Sam's Club.",
        marketCap: 745,
        peRatio: 39.1,
        dividendYield: 0.91,
        yearHigh: 99.45,
        yearLow: 57.8,
    },
    {
        symbol: "XOM",
        name: "Exxon Mobil Corporation",
        sector: "Energy",
        base: 118.92,
        description: "ExxonMobil explores for and produces crude oil and natural gas; manufactures, trades and markets petroleum products.",
        marketCap: 522,
        peRatio: 14.7,
        dividendYield: 3.27,
        yearHigh: 126.34,
        yearLow: 95.78,
    },
    {
        symbol: "DIS",
        name: "The Walt Disney Company",
        sector: "Communication Services",
        base: 109.32,
        description: "Disney operates entertainment and media businesses across linear networks, streaming, parks and consumer products.",
        marketCap: 198,
        peRatio: 38.6,
        dividendYield: 0.82,
        yearHigh: 123.74,
        yearLow: 83.91,
    },
    {
        symbol: "NFLX",
        name: "Netflix, Inc.",
        sector: "Communication Services",
        base: 712.43,
        description: "Netflix is a subscription streaming entertainment service offering TV series, documentaries and feature films across genres.",
        marketCap: 308,
        peRatio: 47.5,
        dividendYield: 0,
        yearHigh: 745.1,
        yearLow: 411.6,
    },
    {
        symbol: "AMD",
        name: "Advanced Micro Devices, Inc.",
        sector: "Semiconductors",
        base: 162.18,
        description: "AMD is a global semiconductor company offering CPUs, GPUs and adaptive computing platforms for data center, client and gaming markets.",
        marketCap: 264,
        peRatio: 178.3,
        dividendYield: 0,
        yearHigh: 211.4,
        yearLow: 116.4,
    },
    {
        symbol: "BAC",
        name: "Bank of America Corporation",
        sector: "Financial Services",
        base: 44.89,
        description: "Bank of America provides banking and financial products and services for individual consumers, small and middle market businesses and large corporations.",
        marketCap: 348,
        peRatio: 14.6,
        dividendYield: 2.41,
        yearHigh: 48.1,
        yearLow: 33.07,
    },
    {
        symbol: "PFE",
        name: "Pfizer Inc.",
        sector: "Healthcare",
        base: 28.46,
        description: "Pfizer discovers, develops, manufactures and sells biopharmaceutical products worldwide.",
        marketCap: 161,
        peRatio: 16.9,
        dividendYield: 5.92,
        yearHigh: 31.54,
        yearLow: 24.48,
    },
    {
        symbol: "KO",
        name: "The Coca-Cola Company",
        sector: "Consumer Staples",
        base: 71.22,
        description: "Coca-Cola is a beverage company that manufactures, markets and sells various nonalcoholic beverages worldwide.",
        marketCap: 308,
        peRatio: 26.2,
        dividendYield: 2.69,
        yearHigh: 74.38,
        yearLow: 57.93,
    },
    {
        symbol: "ORCL",
        name: "Oracle Corporation",
        sector: "Technology",
        base: 184.57,
        description: "Oracle offers products and services that address enterprise IT environments, including cloud, database and application software.",
        marketCap: 510,
        peRatio: 41.7,
        dividendYield: 0.86,
        yearHigh: 198.31,
        yearLow: 99.26,
    },
];
export const POPULAR_SYMBOLS = UNIVERSE.map((s) => s.symbol);
const META_BY_SYMBOL = Object.fromEntries(UNIVERSE.map((s) => [s.symbol, s]));
export function getMeta(symbol) {
    return META_BY_SYMBOL[symbol.toUpperCase()];
}
function symbolSeed(symbol) {
    let h = 0;
    for (let i = 0; i < symbol.length; i++)
        h = (h * 31 + symbol.charCodeAt(i)) | 0;
    return h;
}
// Deterministic pseudo-random in [0,1) from integer seed
function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}
export function getQuote(symbol, atTime = Date.now()) {
    const meta = getMeta(symbol);
    if (!meta)
        return undefined;
    const seed = symbolSeed(meta.symbol);
    // Slow drift over the last 24h
    const minutes = Math.floor(atTime / 60000);
    const dailyOsc = Math.sin((minutes / 60) * 0.7 + seed) * meta.base * 0.012;
    const microOsc = Math.sin(minutes * 1.7 + seed * 0.13) * meta.base * 0.004;
    const trend = (rand(seed + Math.floor(atTime / 86400000)) - 0.5) * meta.base * 0.018;
    const price = +(meta.base + dailyOsc + microOsc + trend).toFixed(2);
    const previousClose = +(meta.base + Math.sin(seed + 0.3) * meta.base * 0.008).toFixed(2);
    const change = +(price - previousClose).toFixed(2);
    const changePercent = +((change / previousClose) * 100).toFixed(2);
    return {
        symbol: meta.symbol,
        name: meta.name,
        sector: meta.sector,
        price,
        change,
        changePercent,
        previousClose,
    };
}
export function getAllQuotes(atTime = Date.now()) {
    return UNIVERSE.map((m) => getQuote(m.symbol, atTime));
}
export function getQuoteDetail(symbol) {
    const meta = getMeta(symbol);
    const q = getQuote(symbol);
    if (!meta || !q)
        return undefined;
    const seed = symbolSeed(meta.symbol);
    const dayHigh = +(q.price * (1 + 0.012 + rand(seed + 1) * 0.006)).toFixed(2);
    const dayLow = +(q.price * (1 - 0.012 - rand(seed + 2) * 0.006)).toFixed(2);
    const open = +(q.previousClose * (1 + (rand(seed + 3) - 0.5) * 0.01)).toFixed(2);
    const volume = Math.floor(8_000_000 + rand(seed + 4) * 35_000_000);
    return {
        ...q,
        open,
        dayHigh,
        dayLow,
        yearHigh: meta.yearHigh,
        yearLow: meta.yearLow,
        marketCap: meta.marketCap * 1_000_000_000,
        volume,
        peRatio: meta.peRatio,
        dividendYield: meta.dividendYield,
        description: meta.description,
    };
}
const RANGE_CONFIG = {
    "1D": { count: 78, stepMs: 5 * 60 * 1000 }, // 5min ~ 6.5h trading day
    "1W": { count: 70, stepMs: 60 * 60 * 1000 }, // hourly
    "1M": { count: 30, stepMs: 24 * 60 * 60 * 1000 },
    "3M": { count: 65, stepMs: 24 * 60 * 60 * 1000 },
    "1Y": { count: 52, stepMs: 7 * 24 * 60 * 60 * 1000 },
    ALL: { count: 60, stepMs: 30 * 24 * 60 * 60 * 1000 },
};
export function getChart(symbol, range = "1D") {
    const meta = getMeta(symbol);
    if (!meta)
        return [];
    const seed = symbolSeed(meta.symbol);
    const cfg = RANGE_CONFIG[range];
    const now = Date.now();
    const candles = [];
    let price = meta.base * 0.92 + rand(seed) * meta.base * 0.04;
    for (let i = cfg.count - 1; i >= 0; i--) {
        const t = new Date(now - i * cfg.stepMs);
        const drift = (rand(seed + i + range.charCodeAt(0)) - 0.48) * meta.base * 0.01;
        const o = price;
        const c = +(o + drift).toFixed(2);
        const h = +Math.max(o, c, o + Math.abs(drift) * 1.4).toFixed(2);
        const l = +Math.min(o, c, o - Math.abs(drift) * 1.4).toFixed(2);
        const v = Math.floor(2_000_000 + rand(seed + i * 7) * 18_000_000);
        candles.push({ t: t.toISOString(), o, h, l: l, c, v });
        price = c;
    }
    // Pin last close to current quote so chart matches the price card
    const liveQuote = getQuote(symbol);
    if (liveQuote && candles.length) {
        const last = candles[candles.length - 1];
        last.c = liveQuote.price;
        last.h = +Math.max(last.h, liveQuote.price).toFixed(2);
        last.l = +Math.min(last.l, liveQuote.price).toFixed(2);
    }
    return candles;
}
const INDICES = [
    { symbol: "SPX", name: "S&P 500", base: 5828.31 },
    { symbol: "DJI", name: "Dow Jones Industrial Average", base: 42934.65 },
    { symbol: "IXIC", name: "Nasdaq Composite", base: 18712.32 },
    { symbol: "RUT", name: "Russell 2000", base: 2348.42 },
];
export function getIndices() {
    return INDICES.map((idx) => {
        const seed = symbolSeed(idx.symbol);
        const minutes = Math.floor(Date.now() / 60000);
        const drift = Math.sin((minutes / 60) * 0.5 + seed) * idx.base * 0.006;
        const value = +(idx.base + drift).toFixed(2);
        const previousClose = +(idx.base + Math.sin(seed + 0.4) * idx.base * 0.003).toFixed(2);
        const change = +(value - previousClose).toFixed(2);
        const changePercent = +((change / previousClose) * 100).toFixed(2);
        return { symbol: idx.symbol, name: idx.name, value, change, changePercent };
    });
}
export function getNews() {
    const now = Date.now();
    const items = [
        {
            id: "n1",
            headline: "Fed signals patient stance as inflation cools toward target",
            source: "Orion Wire",
            category: "Macro",
            symbols: [],
            summary: "Policymakers struck a measured tone in minutes released Wednesday, citing softening price pressures while keeping the door open to a cut later this quarter.",
        },
        {
            id: "n2",
            headline: "NVIDIA tops estimates as data center revenue accelerates",
            source: "Markets Daily",
            category: "Earnings",
            symbols: ["NVDA"],
            summary: "The chipmaker reported record quarterly results, lifting full-year guidance on stronger-than-expected enterprise AI deployments.",
        },
        {
            id: "n3",
            headline: "Apple expands services bundle to include premium AI tier",
            source: "Orion Research",
            category: "Technology",
            symbols: ["AAPL"],
            summary: "Apple unveiled a new tier of subscription services with on-device generative features, broadening recurring revenue mix beyond hardware.",
        },
        {
            id: "n4",
            headline: "Energy stocks gain as crude posts third weekly advance",
            source: "Orion Wire",
            category: "Commodities",
            symbols: ["XOM"],
            summary: "Brent crude futures climbed above key resistance, lifting integrated majors and refiners as supply concerns persist.",
        },
        {
            id: "n5",
            headline: "JPMorgan raises full-year net interest income outlook",
            source: "Markets Daily",
            category: "Financials",
            symbols: ["JPM", "BAC"],
            summary: "The bank cited resilient consumer spending and stronger trading volumes, sending shares of money-center peers higher.",
        },
        {
            id: "n6",
            headline: "Tesla deliveries beat consensus on China demand rebound",
            source: "Orion Research",
            category: "Autos",
            symbols: ["TSLA"],
            summary: "Quarterly deliveries surprised to the upside as the company's revamped lineup gained traction in key Asian markets.",
        },
        {
            id: "n7",
            headline: "Healthcare names rotate higher as defensive bid resurfaces",
            source: "Orion Wire",
            category: "Sectors",
            symbols: ["JNJ", "PFE"],
            summary: "Investors leaned into large-cap pharma after a softer-than-expected employment print revived defensive positioning.",
        },
        {
            id: "n8",
            headline: "Streaming wars: Netflix tests ad-supported live sports tier",
            source: "Markets Daily",
            category: "Media",
            symbols: ["NFLX", "DIS"],
            summary: "Netflix is reportedly piloting a lower-priced live sports experience aimed at ad-supported subscribers in select markets.",
        },
    ];
    return items.map((it, i) => ({
        ...it,
        publishedAt: new Date(now - (i + 1) * 47 * 60 * 1000).toISOString(),
    }));
}
export function getMovers() {
    const quotes = getAllQuotes();
    const sortedByPct = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    return {
        gainers: sortedByPct.slice(0, 5),
        losers: sortedByPct.slice(-5).reverse(),
        mostActive: [...quotes]
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, 5),
    };
}
export function getEquityCurve(baseEquity, range = "1M") {
    const cfg = RANGE_CONFIG[range];
    const now = Date.now();
    const seed = symbolSeed("PORTFOLIO_" + range);
    const startValue = +(baseEquity * (0.92 + (rand(seed) - 0.5) * 0.06)).toFixed(2);
    const points = [];
    let v = startValue;
    for (let i = cfg.count - 1; i >= 0; i--) {
        const drift = (rand(seed + i) - 0.45) * baseEquity * 0.004;
        v = +(v + drift).toFixed(2);
        points.push({ t: new Date(now - i * cfg.stepMs).toISOString(), v });
    }
    // pin endpoint to actual current equity
    if (points.length)
        points[points.length - 1].v = +baseEquity.toFixed(2);
    return { points, startValue, endValue: +baseEquity.toFixed(2) };
}
