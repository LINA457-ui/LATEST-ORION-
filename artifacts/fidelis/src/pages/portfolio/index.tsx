import { useState } from "react";
import { useListPositions, useGetAllocation, useGetAccountPerformance } from "@workspace/api-client-react";
import { formatCurrency, formatPercent, formatChange } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

export default function PortfolioPage() {
  const [range, setRange] = useState<"1D"|"1W"|"1M"|"3M"|"1Y"|"ALL">("1M");
  
  const { data: positions, isLoading: loadingPos } = useListPositions();
  const { data: allocation, isLoading: loadingAlloc } = useGetAllocation();
  const { data: performance, isLoading: loadingPerf } = useGetAccountPerformance({ range });

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))'
  ];

  if (loadingPos || loadingAlloc || loadingPerf) {
    return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  }

  const totalMarketValue = positions?.reduce((acc, pos) => acc + pos.marketValue, 0) || 0;
  const totalUnrealizedPnl = positions?.reduce((acc, pos) => acc + pos.unrealizedPnl, 0) || 0;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">Manage your holdings and asset allocation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Market Value</div>
            <div className="text-3xl font-bold">{formatCurrency(totalMarketValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Unrealized P&L</div>
            <div className={`text-3xl font-bold ${totalUnrealizedPnl >= 0 ? "text-success" : "text-destructive"}`}>
              {formatChange(totalUnrealizedPnl)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Positions Count</div>
            <div className="text-3xl font-bold">{positions?.length || 0}</div>
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
                {!positions?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No open positions
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((pos) => (
                    <TableRow key={pos.id} className="group">
                      <TableCell className="font-medium">
                        <Link href={`/markets/${pos.symbol}`} className="hover:underline flex items-center gap-1">
                          {pos.symbol}
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-xs text-muted-foreground font-normal">{pos.name}</div>
                      </TableCell>
                      <TableCell className="text-right">{pos.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(pos.currentPrice)}</TableCell>
                      <TableCell className={`text-right ${pos.dayChange >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatChange(pos.dayChange)}
                        <div className="text-xs">{formatChange(pos.dayChangePercent, true)}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(pos.averageCost)}</TableCell>
                      <TableCell className={`text-right ${pos.unrealizedPnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatChange(pos.unrealizedPnl)}
                        <div className="text-xs">{formatChange(pos.unrealizedPnlPercent, true)}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(pos.marketValue)}</TableCell>
                    </TableRow>
                  ))
                )}
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
                  {performance && (
                    <span className={performance.change >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                      {formatChange(performance.change)} ({formatChange(performance.changePercent, true)})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-1 bg-muted p-1 rounded-md">
                {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                      range === r ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {performance && (
                <div className="h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performance.points} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="t" 
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return range === '1D' ? `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        }} 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val}`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                        formatter={(value: number) => [formatCurrency(value), 'Value']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="v" 
                        stroke={performance.change >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[300px] w-full max-w-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation?.bySector || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {allocation?.bySector.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {allocation?.bySector.map((item, i) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                        <span className="text-muted-foreground w-12 text-right">{formatChange(item.percent, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[300px] w-full max-w-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation?.byAsset || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {allocation?.byAsset.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {allocation?.byAsset.map((item, i) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                        <span className="text-muted-foreground w-12 text-right">{formatChange(item.percent, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
