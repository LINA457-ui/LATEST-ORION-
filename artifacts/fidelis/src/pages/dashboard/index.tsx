import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatCurrency, formatPercent, formatChange } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronUp, ChevronDown, Activity, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="text-destructive">Failed to load dashboard.</div>;
  }

  const { account, equityCurve, positions, watchlist, indices, movers, recentOrders, news } = summary;
  const isPositive = equityCurve.change >= 0;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Portfolio Summary</h1>
        <p className="text-muted-foreground">Welcome back, {account.displayName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(account.totalEquity)}</div>
            <p className={`text-sm font-medium mt-1 flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {formatChange(account.dayChange)} ({formatChange(account.dayChangePercent, true)})
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.portfolioValue)}</div>
            <p className="text-sm text-muted-foreground mt-1">Invested assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.cashBalance)}</div>
            <p className="text-sm text-muted-foreground mt-1">Available to trade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Buying Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.buyingPower)}</div>
            <p className="text-sm text-muted-foreground mt-1">With margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Performance</CardTitle>
              <CardDescription>Value over time ({equityCurve.range})</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio">Full Details</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve.points} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="t" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return equityCurve.range === '1D' ? `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    }} 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
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
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '14px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    formatter={(value: number) => [formatCurrency(value), 'Value']}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="v" 
                    stroke={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} 
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
            {positions.length > 0 ? (
              <div className="space-y-4 mt-2">
                {positions.slice(0, 5).map(pos => (
                  <div key={pos.id} className="flex items-center justify-between">
                    <div>
                      <Link href={`/markets/${pos.symbol}`} className="font-bold hover:underline">{pos.symbol}</Link>
                      <div className="text-xs text-muted-foreground">{pos.quantity} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(pos.marketValue)}</div>
                      <div className={`text-xs font-medium ${pos.dayChange >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatChange(pos.dayChangePercent, true)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Briefcase className="w-10 h-10 mb-2 opacity-20" />
                <p>No positions yet</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/trade">Trade now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Market Indices</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8">
              <Link href="/markets">View all <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {indices.map(idx => (
                <div key={idx.symbol} className="flex items-center justify-between py-3 first:pt-1">
                  <div>
                    <div className="font-bold">{idx.name}</div>
                    <div className="text-xs text-muted-foreground">{idx.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(idx.value)}</div>
                    <div className={`text-sm font-medium ${idx.change >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatChange(idx.changePercent, true)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent News</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {news.slice(0, 4).map(item => (
                <div key={item.id} className="group">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.source}</span>
                    <span>•</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <a href="#" className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {item.headline}
                  </a>
                  <div className="flex gap-1 mt-2">
                    {item.symbols.map(sym => (
                      <Badge key={sym} variant="secondary" className="text-[10px] px-1.5 py-0">
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
    </div>
  );
}
