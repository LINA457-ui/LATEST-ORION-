import { useState } from "react";
import { formatCurrency, formatChange } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";

type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const dummyPositions = [
  {
    id: "pos-1",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 120,
    currentPrice: 198.42,
    dayChange: 2.34,
    dayChangePercent: 1.19,
    averageCost: 152.5,
    unrealizedPnl: 5510.4,
    unrealizedPnlPercent: 30.11,
    marketValue: 23810.4,
  },
  {
    id: "pos-2",
    symbol: "MSFT",
    name: "Microsoft Corporation",
    quantity: 80,
    currentPrice: 431.22,
    dayChange: 4.18,
    dayChangePercent: 0.98,
    averageCost: 355.1,
    unrealizedPnl: 6089.6,
    unrealizedPnlPercent: 21.43,
    marketValue: 34497.6,
  },
  {
    id: "pos-3",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    quantity: 150,
    currentPrice: 122.88,
    dayChange: 3.72,
    dayChangePercent: 3.12,
    averageCost: 84.2,
    unrealizedPnl: 5802,
    unrealizedPnlPercent: 45.94,
    marketValue: 18432,
  },
  {
    id: "pos-4",
    symbol: "TSLA",
    name: "Tesla Inc.",
    quantity: 60,
    currentPrice: 244.91,
    dayChange: -2.16,
    dayChangePercent: -0.87,
    averageCost: 210.4,
    unrealizedPnl: 2070.6,
    unrealizedPnlPercent: 16.4,
    marketValue: 14694.6,
  },
  {
    id: "pos-5",
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    quantity: 90,
    currentPrice: 187.35,
    dayChange: 1.44,
    dayChangePercent: 0.77,
    averageCost: 145.8,
    unrealizedPnl: 3739.5,
    unrealizedPnlPercent: 28.5,
    marketValue: 16861.5,
  },
  {
    id: "pos-6",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    quantity: 75,
    currentPrice: 171.26,
    dayChange: -0.82,
    dayChangePercent: -0.48,
    averageCost: 139.9,
    unrealizedPnl: 2352,
    unrealizedPnlPercent: 22.42,
    marketValue: 12844.5,
  },
];

const dummyAllocation = {
  bySector: [
    { label: "Technology", value: 58308, percent: 48.2 },
    { label: "Consumer Discretionary", value: 31556.1, percent: 26.1 },
    { label: "Communication Services", value: 12844.5, percent: 10.6 },
    { label: "AI & Semiconductors", value: 18432, percent: 15.1 },
  ],
  byAsset: [
    { label: "Stocks", value: 102320.6, percent: 84.6 },
    { label: "Cash", value: 12500, percent: 10.3 },
    { label: "ETFs", value: 4120, percent: 3.4 },
    { label: "Crypto", value: 2050, percent: 1.7 },
  ],
};

const dummyPerformanceByRange: Record<
  Range,
  { change: number; changePercent: number; points: { t: string; v: number }[] }
> = {
  "1D": {
    change: 1420.75,
    changePercent: 1.18,
    points: [
      { t: "9AM", v: 119800 },
      { t: "10AM", v: 120250 },
      { t: "11AM", v: 120120 },
      { t: "12PM", v: 120880 },
      { t: "1PM", v: 121020 },
      { t: "2PM", v: 121560 },
      { t: "3PM", v: 121220 },
    ],
  },
  "1W": {
    change: 3850.25,
    changePercent: 3.27,
    points: [
      { t: "Mon", v: 117400 },
      { t: "Tue", v: 118200 },
      { t: "Wed", v: 119100 },
      { t: "Thu", v: 120450 },
      { t: "Fri", v: 121250 },
    ],
  },
  "1M": {
    change: 8420.9,
    changePercent: 7.45,
    points: [
      { t: "W1", v: 112900 },
      { t: "W2", v: 115300 },
      { t: "W3", v: 118750 },
      { t: "W4", v: 121320 },
    ],
  },
  "3M": {
    change: 18450.4,
    changePercent: 17.93,
    points: [
      { t: "Feb", v: 102870 },
      { t: "Mar", v: 109450 },
      { t: "Apr", v: 116980 },
      { t: "May", v: 121320 },
    ],
  },
  "1Y": {
    change: 35210.75,
    changePercent: 40.88,
    points: [
      { t: "Jun", v: 86109 },
      { t: "Aug", v: 93450 },
      { t: "Oct", v: 98400 },
      { t: "Dec", v: 105900 },
      { t: "Feb", v: 113700 },
      { t: "May", v: 121320 },
    ],
  },
  ALL: {
    change: 71320.6,
    changePercent: 142.64,
    points: [
      { t: "2021", v: 50000 },
      { t: "2022", v: 68400 },
      { t: "2023", v: 81200 },
      { t: "2024", v: 95300 },
      { t: "2025", v: 110400 },
      { t: "2026", v: 121320 },
    ],
  },
};

export default function PortfolioPage() {
  const [range, setRange] = useState<Range>("1M");

  const safePositions = dummyPositions;
  const allocation = dummyAllocation;
  const performance = dummyPerformanceByRange[range];

  const totalMarketValue = safePositions.reduce(
    (acc, pos) => acc + Number(pos.marketValue ?? 0),
    0
  );

  const totalUnrealizedPnl = safePositions.reduce(
    (acc, pos) => acc + Number(pos.unrealizedPnl ?? 0),
    0
  );

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--primary))",
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Portfolio
        </h1>
        <p className="text-muted-foreground">
          Manage your holdings and asset allocation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Market Value
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(totalMarketValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Unrealized P&amp;L
            </div>
            <div
              className={`text-3xl font-bold ${
                totalUnrealizedPnl >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatChange(totalUnrealizedPnl)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Positions Count
            </div>
            <div className="text-3xl font-bold">{safePositions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Day Change</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Total Return</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {safePositions.map((pos) => (
                  <TableRow key={pos.id} className="group">
                    <TableCell className="font-medium">
                      <Link
                        href={`/markets/${pos.symbol}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        {pos.symbol}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="text-xs text-muted-foreground font-normal">
                        {pos.name}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">{pos.quantity}</TableCell>

                    <TableCell className="text-right font-medium">
                      {formatCurrency(pos.currentPrice)}
                    </TableCell>

                    <TableCell
                      className={`text-right ${
                        pos.dayChange >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatChange(pos.dayChange)}
                      <div className="text-xs">
                        {formatChange(pos.dayChangePercent, true)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      {formatCurrency(pos.averageCost)}
                    </TableCell>

                    <TableCell
                      className={`text-right ${
                        pos.unrealizedPnl >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {formatChange(pos.unrealizedPnl)}
                      <div className="text-xs">
                        {formatChange(pos.unrealizedPnlPercent, true)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-bold">
                      {formatCurrency(pos.marketValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Historical Performance</CardTitle>
                <CardDescription>
                  <span
                    className={
                      performance.change >= 0
                        ? "text-success font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {formatChange(performance.change)} (
                    {formatChange(performance.changePercent, true)})
                  </span>
                </CardDescription>
              </div>

              <div className="flex gap-1 bg-muted p-1 rounded-md">
                {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-sm ${
                      range === r
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.points}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="t" />
                    <YAxis domain={["auto", "auto"]} />
                    <RechartsTooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Value",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Sector Allocation", data: allocation.bySector },
              { title: "Asset Allocation", data: allocation.byAsset },
            ].map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle>{group.title}</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col items-center">
                  <div className="h-[300px] w-full max-w-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={group.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {group.data.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full mt-4 space-y-2">
                    {group.data.map((item, i) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex gap-4">
                          <span className="font-medium">
                            {formatCurrency(item.value)}
                          </span>
                          <span className="text-muted-foreground w-12 text-right">
                            {formatChange(item.percent, true)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}