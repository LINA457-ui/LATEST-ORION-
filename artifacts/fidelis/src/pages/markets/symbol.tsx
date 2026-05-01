import { useState } from "react";
import { useParams, Link } from "wouter";
import { usePageBreadcrumb } from "@/components/layout/AppBreadcrumb";
import {
  formatCurrency,
  formatChange,
  formatCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const dummyQuotes: Record<string, any> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 198.42,
    change: 2.34,
    changePercent: 1.19,
    previousClose: 196.08,
    open: 197.1,
    dayLow: 195.82,
    dayHigh: 199.25,
    yearLow: 164.08,
    yearHigh: 237.49,
    marketCap: 2980000000000,
    volume: 58234120,
    peRatio: 30.42,
    dividendYield: 0.005,
    description:
      "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company also provides software, services, cloud solutions, and digital content through its ecosystem.",
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 431.22,
    change: 4.18,
    changePercent: 0.98,
    previousClose: 427.04,
    open: 428.11,
    dayLow: 426.8,
    dayHigh: 433.5,
    yearLow: 350.1,
    yearHigh: 468.35,
    marketCap: 3210000000000,
    volume: 32459100,
    peRatio: 36.74,
    dividendYield: 0.007,
    description:
      "Microsoft Corporation develops and supports software, services, devices, and cloud-based solutions. Its major segments include productivity software, cloud infrastructure, gaming, enterprise tools, and AI platforms.",
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 122.88,
    change: 3.72,
    changePercent: 3.12,
    previousClose: 119.16,
    open: 120.52,
    dayLow: 119.8,
    dayHigh: 124.1,
    yearLow: 75.2,
    yearHigh: 153.13,
    marketCap: 3010000000000,
    volume: 74219000,
    peRatio: 44.15,
    dividendYield: 0.0003,
    description:
      "NVIDIA Corporation is a leading semiconductor company known for graphics processing units, accelerated computing, AI infrastructure, gaming technology, data center chips, and professional visualization platforms.",
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 244.91,
    change: -2.16,
    changePercent: -0.87,
    previousClose: 247.07,
    open: 246.3,
    dayLow: 241.88,
    dayHigh: 248.74,
    yearLow: 138.8,
    yearHigh: 299.29,
    marketCap: 781000000000,
    volume: 68125000,
    peRatio: 68.32,
    dividendYield: 0,
    description:
      "Tesla Inc. designs, develops, manufactures, and sells electric vehicles, energy generation products, battery storage systems, and related technologies.",
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 187.35,
    change: 1.44,
    changePercent: 0.77,
    previousClose: 185.91,
    open: 186.4,
    dayLow: 184.72,
    dayHigh: 188.21,
    yearLow: 151.61,
    yearHigh: 201.2,
    marketCap: 1950000000000,
    volume: 41502000,
    peRatio: 41.9,
    dividendYield: 0,
    description:
      "Amazon.com Inc. operates across e-commerce, cloud computing, digital streaming, logistics, advertising, and artificial intelligence services through its global marketplace and AWS platform.",
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 171.26,
    change: -0.82,
    changePercent: -0.48,
    previousClose: 172.08,
    open: 171.9,
    dayLow: 169.7,
    dayHigh: 173.15,
    yearLow: 132.5,
    yearHigh: 191.75,
    marketCap: 2120000000000,
    volume: 28764000,
    peRatio: 24.88,
    dividendYield: 0.004,
    description:
      "Alphabet Inc. is the parent company of Google and operates businesses across search, advertising, cloud computing, YouTube, Android, AI, and other technology-driven services.",
  },
};

const dummyChartByRange: Record<Range, { t: string; c: number }[]> = {
  "1D": [
    { t: "2026-05-01T09:00:00", c: 194.8 },
    { t: "2026-05-01T10:00:00", c: 195.7 },
    { t: "2026-05-01T11:00:00", c: 196.2 },
    { t: "2026-05-01T12:00:00", c: 197.1 },
    { t: "2026-05-01T13:00:00", c: 196.9 },
    { t: "2026-05-01T14:00:00", c: 198.1 },
    { t: "2026-05-01T15:00:00", c: 198.42 },
  ],
  "1W": [
    { t: "2026-04-27", c: 190.2 },
    { t: "2026-04-28", c: 192.4 },
    { t: "2026-04-29", c: 193.7 },
    { t: "2026-04-30", c: 196.08 },
    { t: "2026-05-01", c: 198.42 },
  ],
  "1M": [
    { t: "2026-04-01", c: 181.4 },
    { t: "2026-04-07", c: 184.8 },
    { t: "2026-04-14", c: 188.5 },
    { t: "2026-04-21", c: 193.2 },
    { t: "2026-05-01", c: 198.42 },
  ],
  "3M": [
    { t: "2026-02-01", c: 168.5 },
    { t: "2026-03-01", c: 176.9 },
    { t: "2026-04-01", c: 181.4 },
    { t: "2026-05-01", c: 198.42 },
  ],
  "1Y": [
    { t: "2025-06-01", c: 164.2 },
    { t: "2025-08-01", c: 172.3 },
    { t: "2025-10-01", c: 179.1 },
    { t: "2025-12-01", c: 188.7 },
    { t: "2026-02-01", c: 190.4 },
    { t: "2026-05-01", c: 198.42 },
  ],
  ALL: [
    { t: "2021-01-01", c: 89.2 },
    { t: "2022-01-01", c: 121.5 },
    { t: "2023-01-01", c: 139.4 },
    { t: "2024-01-01", c: 158.7 },
    { t: "2025-01-01", c: 177.2 },
    { t: "2026-05-01", c: 198.42 },
  ],
};

export default function SymbolDetailPage() {
  const { symbol } = useParams();
  const safeSymbol = (symbol || "AAPL").toUpperCase();

  const [range, setRange] = useState<Range>("1M");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [isWatched, setIsWatched] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);

  const { toast } = useToast();

  const quote = dummyQuotes[safeSymbol] || dummyQuotes.AAPL;
  const chart = dummyChartByRange[range];

  usePageBreadcrumb(quote.symbol);

  const isPositive = quote.change >= 0;

  const handleWatchlistToggle = () => {
    setIsWatched((prev) => !prev);

    toast({
      title: isWatched ? "Removed from watchlist" : "Added to watchlist",
      description: `${quote.symbol} has been ${
        isWatched ? "removed from" : "added to"
      } your watchlist.`,
    });
  };

  const handleTrade = async () => {
    const qty = parseFloat(quantity);

    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid share quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsOrdering(true);

    setTimeout(() => {
      setIsOrdering(false);

      toast({
        title: "Order Placed",
        description: `${side.toUpperCase()} ${qty} shares of ${quote.symbol}`,
        action: <CheckCircle2 className="w-4 h-4 text-success" />,
      });
    }, 600);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/markets">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">
            {quote.symbol}
          </h1>
          <p className="text-muted-foreground">{quote.name}</p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleWatchlistToggle}>
            <Star
              className={`w-4 h-4 mr-2 ${
                isWatched ? "fill-primary text-primary" : ""
              }`}
            />
            {isWatched ? "Watching" : "Watch"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold">
                    {formatCurrency(quote.price)}
                  </div>

                  <div
                    className={`text-lg font-medium mt-1 ${
                      isPositive ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatChange(quote.change)} (
                    {formatChange(quote.changePercent, true)})
                  </div>
                </div>

                <div className="flex gap-1 bg-muted p-1 rounded-md mb-1">
                  {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map(
                    (r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                          range === r
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart}
                    margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorPrice"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={`hsl(var(--${
                            isPositive ? "success" : "destructive"
                          }))`}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={`hsl(var(--${
                            isPositive ? "success" : "destructive"
                          }))`}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />

                    <XAxis
                      dataKey="t"
                      tickFormatter={(val) => {
                        const d = new Date(val);

                        return range === "1D"
                          ? `${d.getHours()}:${d
                              .getMinutes()
                              .toString()
                              .padStart(2, "0")}`
                          : d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            });
                      }}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />

                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(val) => `$${val}`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />

                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "14px",
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Price",
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="c"
                      stroke={`hsl(var(--${
                        isPositive ? "success" : "destructive"
                      }))`}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About {quote.name}</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {quote.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Previous Close
                  </div>
                  <div className="font-medium">
                    {formatCurrency(quote.previousClose)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Open
                  </div>
                  <div className="font-medium">
                    {formatCurrency(quote.open)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Day Range
                  </div>
                  <div className="font-medium">
                    {formatCurrency(quote.dayLow)} -{" "}
                    {formatCurrency(quote.dayHigh)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    52W Range
                  </div>
                  <div className="font-medium">
                    {formatCurrency(quote.yearLow)} -{" "}
                    {formatCurrency(quote.yearHigh)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Market Cap
                  </div>
                  <div className="font-medium">
                    {formatCompact(quote.marketCap)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Volume
                  </div>
                  <div className="font-medium">
                    {formatCompact(quote.volume)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    P/E Ratio
                  </div>
                  <div className="font-medium">
                    {formatNumber(quote.peRatio)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Div Yield
                  </div>
                  <div className="font-medium">
                    {formatPercent(
                      quote.dividendYield ? quote.dividendYield * 100 : 0
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle>Trade {quote.symbol}</CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="flex p-1 bg-muted rounded-md">
                <button
                  className={`flex-1 py-2 text-sm font-bold rounded-sm transition-colors ${
                    side === "buy"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setSide("buy")}
                >
                  Buy
                </button>

                <button
                  className={`flex-1 py-2 text-sm font-bold rounded-sm transition-colors ${
                    side === "sell"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setSide("sell")}
                >
                  Sell
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Quantity (Shares)
                  </label>

                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-32 text-right"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order Type</span>
                  <span className="font-medium">Market</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Est. Price</span>
                  <span className="font-medium">
                    {formatCurrency(quote.price)}
                  </span>
                </div>

                <div className="pt-4 border-t flex items-center justify-between">
                  <span className="font-bold">Estimated Total</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(quote.price * (parseFloat(quantity) || 0))}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold"
                size="lg"
                onClick={handleTrade}
                disabled={isOrdering || !parseFloat(quantity)}
                variant={side === "buy" ? "default" : "destructive"}
              >
                {isOrdering
                  ? "Processing..."
                  : `Place ${side.toUpperCase()} Order`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}