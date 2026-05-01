import { useUser } from "@clerk/clerk-react";
import { formatCurrency, formatChange } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Activity,
  Clock,
  Briefcase,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Receipt,
  Banknote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const dummySummary = {
  account: {
    totalEquity: 400000000,
    dayChange: 2845000,
    dayChangePercent: 0.72,
    portfolioValue: 396000000,
    cashBalance: 4000000,
    buyingPower: 400000000,
  },

  equityCurve: {
    range: "1M",
    points: [
      { t: "2026-04-01", v: 372000000 },
      { t: "2026-04-07", v: 378500000 },
      { t: "2026-04-14", v: 384200000 },
      { t: "2026-04-21", v: 391800000 },
      { t: "2026-05-01", v: 400000000 },
    ],
  },

  positions: [
    {
      id: "pos-1",
      symbol: "AAPL",
      quantity: 1200,
      marketValue: 23810400,
      dayChangePercent: 1.19,
    },
    {
      id: "pos-2",
      symbol: "MSFT",
      quantity: 850,
      marketValue: 36653700,
      dayChangePercent: 0.98,
    },
    {
      id: "pos-3",
      symbol: "NVDA",
      quantity: 2500,
      marketValue: 30720000,
      dayChangePercent: 3.12,
    },
    {
      id: "pos-4",
      symbol: "AMZN",
      quantity: 1600,
      marketValue: 29976000,
      dayChangePercent: 0.77,
    },
    {
      id: "pos-5",
      symbol: "TSLA",
      quantity: 900,
      marketValue: 22041900,
      dayChangePercent: -0.87,
    },
  ],

  recentOrders: [
    {
      id: "ord-1",
      side: "buy",
      symbol: "NVDA",
      quantity: 50,
      price: 122.88,
      total: 6144,
      createdAt: "2026-05-01",
    },
    {
      id: "ord-2",
      side: "buy",
      symbol: "AAPL",
      quantity: 25,
      price: 198.42,
      total: 4960.5,
      createdAt: "2026-04-30",
    },
    {
      id: "ord-3",
      side: "sell",
      symbol: "TSLA",
      quantity: 10,
      price: 244.91,
      total: 2449.1,
      createdAt: "2026-04-29",
    },
  ],

  recentTransactions: [
    {
      id: "txn-1",
      type: "deposit",
      amount: 4000000,
      description: "Account funding deposit",
      createdAt: "2026-05-01",
    },
    {
      id: "txn-2",
      type: "dividend",
      amount: 125000,
      description: "Quarterly dividend payout",
      createdAt: "2026-04-28",
    },
    {
      id: "txn-3",
      type: "fee",
      amount: -15000,
      description: "Trading service fee",
      createdAt: "2026-04-27",
    },
  ],

  indices: [
    {
      id: "idx-1",
      name: "S&P 500",
      symbol: "SPX",
      value: 5218.35,
      changePercent: 0.82,
    },
    {
      id: "idx-2",
      name: "Nasdaq Composite",
      symbol: "IXIC",
      value: 16442.2,
      changePercent: 1.14,
    },
    {
      id: "idx-3",
      name: "Dow Jones",
      symbol: "DJI",
      value: 38672.91,
      changePercent: -0.18,
    },
  ],

  news: [
    {
      id: "news-1",
      source: "Orion Markets",
      publishedAt: "2026-05-01",
      headline: "Technology stocks push portfolios higher as AI momentum continues.",
      symbols: ["NVDA", "MSFT"],
    },
    {
      id: "news-2",
      source: "Market Desk",
      publishedAt: "2026-04-30",
      headline: "Apple gains after stronger services revenue expectations.",
      symbols: ["AAPL"],
    },
    {
      id: "news-3",
      source: "Equity Watch",
      publishedAt: "2026-04-29",
      headline: "Tesla slips as traders review delivery and margin outlook.",
      symbols: ["TSLA"],
    },
  ],
};

function safeDate(value: string) {
  return new Date(value);
}

export default function DashboardPage() {
  const { user } = useUser();

  const account = dummySummary.account;
  const equityCurve = dummySummary.equityCurve;
  const positions = dummySummary.positions;
  const recentOrders = dummySummary.recentOrders;
  const recentTransactions = dummySummary.recentTransactions;
  const indices = dummySummary.indices;
  const news = dummySummary.news;

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Investor";

  const isPositive = account.dayChange >= 0;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">
          Portfolio Summary
        </h1>
        <p className="text-muted-foreground">Welcome back, {displayName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(account.totalEquity)}
            </div>
            <p
              className={`text-sm font-medium mt-1 flex items-center gap-1 ${
                isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {isPositive ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {formatChange(account.dayChange)} (
              {formatChange(account.dayChangePercent, true)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Market Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account.portfolioValue)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Invested assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account.cashBalance)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Available to trade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buying Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account.buyingPower)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">With margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Performance</CardTitle>
              <CardDescription>
                Value over time ({equityCurve.range})
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio">Full Details</Link>
            </Button>
          </CardHeader>

          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={equityCurve.points}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--success))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--success))"
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
                    tickFormatter={(val) =>
                      safeDate(val).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(val) => `$${Number(val).toLocaleString()}`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />

                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "14px",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(Number(value)),
                      "Value",
                    ]}
                    labelFormatter={(label) => safeDate(label).toLocaleString()}
                  />

                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Top Positions</CardTitle>
            <CardDescription>Your largest holdings</CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="space-y-4 mt-2">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <Link
                      href={`/markets/${pos.symbol}`}
                      className="font-bold hover:underline"
                    >
                      {pos.symbol}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {pos.quantity.toLocaleString()} shares
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(pos.marketValue)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        pos.dayChangePercent >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {formatChange(pos.dayChangePercent, true)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest trades on your account</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8">
              <Link href="/portfolio">
                View all <ArrowRight className="ml-1 w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent>
            <div className="divide-y">
              {recentOrders.map((o) => {
                const isBuy = o.side === "buy";

                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between py-3 first:pt-1"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isBuy
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {isBuy ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span className="uppercase text-xs font-semibold tracking-wide">
                            {o.side}
                          </span>
                          <Link
                            href={`/markets/${o.symbol}`}
                            className="hover:underline"
                          >
                            {o.symbol}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {o.quantity} shares @ {formatCurrency(o.price)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(o.total)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {safeDate(o.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Deposits, dividends and fees</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8">
              <Link href="/transactions">
                View all <ArrowRight className="ml-1 w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent>
            <div className="divide-y">
              {recentTransactions.map((t) => {
                const amountPositive = t.amount >= 0;
                const Icon =
                  t.type === "deposit"
                    ? Banknote
                    : t.type === "dividend"
                    ? Coins
                    : Receipt;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3 first:pt-1"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          amountPositive
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="font-medium text-sm capitalize">
                          {t.type}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {t.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          amountPositive ? "text-success" : "text-foreground"
                        }`}
                      >
                        {amountPositive ? "+" : ""}
                        {formatCurrency(t.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {safeDate(t.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Market Indices</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-8">
              <Link href="/markets">
                View all <ArrowRight className="ml-1 w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent>
            <div className="divide-y">
              {indices.map((idx) => (
                <div
                  key={idx.id}
                  className="flex items-center justify-between py-3 first:pt-1"
                >
                  <div>
                    <div className="font-bold">{idx.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {idx.symbol}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {idx.value.toLocaleString()}
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        idx.changePercent >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {formatChange(idx.changePercent, true)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent News</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {news.map((item) => (
                <div key={item.id} className="group">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {item.source}
                    </span>
                    <span>•</span>
                    <span>{safeDate(item.publishedAt).toLocaleDateString()}</span>
                  </div>

                  <a
                    href="#"
                    className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.headline}
                  </a>

                  <div className="flex gap-1 mt-2">
                    {item.symbols.map((sym) => (
                      <Badge
                        key={sym}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {sym}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-muted/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Orion account is fully loaded</h3>
          <p className="text-sm text-muted-foreground">
            Dashboard data is hardcoded for demo stability while keeping the UI realistic.
          </p>
        </div>

        <Button asChild>
          <Link href="/trade">
            Start Trading <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}