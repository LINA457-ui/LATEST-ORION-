import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { usePageBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { useGetQuote, useGetSymbolChart, useGetWatchlist, useAddToWatchlist, useRemoveFromWatchlist, usePlaceOrder } from "@workspace/api-client-react";
import { formatCurrency, formatChange, formatCompact, formatNumber, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function SymbolDetailPage() {
  const { symbol } = useParams();
  const safeSymbol = symbol || "";
  const [range, setRange] = useState<"1D"|"1W"|"1M"|"3M"|"1Y"|"ALL">("1M");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: quote, isLoading: loadingQuote } = useGetQuote(safeSymbol);
  usePageBreadcrumb(safeSymbol ? safeSymbol.toUpperCase() : null);
  const { data: chart, isLoading: loadingChart } = useGetSymbolChart(safeSymbol, { range });
  const { data: watchlist } = useGetWatchlist();
  
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const placeOrder = usePlaceOrder();

  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [isOrdering, setIsOrdering] = useState(false);

  const isWatched = watchlist?.some(q => q.symbol === safeSymbol);

  const handleWatchlistToggle = async () => {
    try {
      if (isWatched) {
        await removeFromWatchlist.mutateAsync({ symbol: safeSymbol });
        toast({ title: "Removed from watchlist" });
      } else {
        await addToWatchlist.mutateAsync({ data: { symbol: safeSymbol } });
        toast({ title: "Added to watchlist" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/account/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
    } catch (e) {
      toast({ title: "Error updating watchlist", variant: "destructive" });
    }
  };

  const handleTrade = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }

    setIsOrdering(true);
    try {
      await placeOrder.mutateAsync({
        data: { symbol: safeSymbol, side, quantity: qty }
      });
      toast({ 
        title: "Order Placed", 
        description: `${side.toUpperCase()} ${qty} shares of ${safeSymbol}`,
        action: <CheckCircle2 className="w-4 h-4 text-success" />
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      setLocation("/trade");
    } catch (error: any) {
      toast({ 
        title: "Order Failed", 
        description: error.message || "Could not place order.",
        variant: "destructive"
      });
    } finally {
      setIsOrdering(false);
    }
  };

  if (loadingQuote) return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!quote) return <div className="p-8 text-destructive">Symbol not found.</div>;

  const isPositive = quote.change >= 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/markets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{quote.symbol}</h1>
          <p className="text-muted-foreground">{quote.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleWatchlistToggle}>
            <Star className={`w-4 h-4 mr-2 ${isWatched ? "fill-primary text-primary" : ""}`} />
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
                  <div className="text-4xl font-bold">{formatCurrency(quote.price)}</div>
                  <div className={`text-lg font-medium mt-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                    {formatChange(quote.change)} ({formatChange(quote.changePercent, true)})
                  </div>
                </div>
                <div className="flex gap-1 bg-muted p-1 rounded-md mb-1">
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
              </div>
            </CardHeader>
            <CardContent>
              {loadingChart ? (
                <Skeleton className="h-[400px] w-full mt-4" />
              ) : (
                <div className="h-[400px] w-full mt-4">
                  {chart?.candles && chart.candles.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chart.candles} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
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
                          formatter={(value: number) => [formatCurrency(value), 'Price']}
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="c" 
                          stroke={`hsl(var(--${isPositive ? 'success' : 'destructive'}))`} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No chart data available</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About {quote.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {quote.description || "No description available."}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Previous Close</div>
                  <div className="font-medium">{formatCurrency(quote.previousClose)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Open</div>
                  <div className="font-medium">{formatCurrency(quote.open)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Day Range</div>
                  <div className="font-medium">{formatCurrency(quote.dayLow)} - {formatCurrency(quote.dayHigh)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">52W Range</div>
                  <div className="font-medium">{formatCurrency(quote.yearLow)} - {formatCurrency(quote.yearHigh)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                  <div className="font-medium">{formatCompact(quote.marketCap)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Volume</div>
                  <div className="font-medium">{formatCompact(quote.volume)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">P/E Ratio</div>
                  <div className="font-medium">{formatNumber(quote.peRatio)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Div Yield</div>
                  <div className="font-medium">{formatPercent(quote.dividendYield ? quote.dividendYield * 100 : 0)}</div>
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
                  className={`flex-1 py-2 text-sm font-bold rounded-sm transition-colors ${side === 'buy' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setSide('buy')}
                >
                  Buy
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-bold rounded-sm transition-colors ${side === 'sell' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setSide('sell')}
                >
                  Sell
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Quantity (Shares)</label>
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
                  <span className="font-medium">{formatCurrency(quote.price)}</span>
                </div>
                <div className="pt-4 border-t flex items-center justify-between">
                  <span className="font-bold">Estimated Total</span>
                  <span className="font-bold text-lg">{formatCurrency(quote.price * (parseFloat(quantity) || 0))}</span>
                </div>
              </div>

              <Button 
                className="w-full h-12 text-base font-bold" 
                size="lg" 
                onClick={handleTrade}
                disabled={isOrdering || !parseFloat(quantity)}
                variant={side === 'buy' ? 'default' : 'destructive'}
              >
                {isOrdering ? "Processing..." : `Place ${side.toUpperCase()} Order`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
