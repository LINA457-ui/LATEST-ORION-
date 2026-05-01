import { useState } from "react";
import {
  useGetWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "@workspace/api-client-react";
import { formatCurrency, formatChange } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type WatchlistQuote = {
  symbol: string;
  name?: string | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
};

const fallbackWatchlist: WatchlistQuote[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 175,
    change: 1.25,
    changePercent: 0.72,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 245,
    change: -2.15,
    changePercent: -0.88,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 450,
    change: 6.5,
    changePercent: 1.46,
  },
];

export default function WatchlistPage() {
  const [symbolInput, setSymbolInput] = useState("");
  const { data: watchlistData, isLoading } = useGetWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const { toast } = useToast();

  const watchlist: WatchlistQuote[] = Array.isArray(watchlistData)
    ? watchlistData
    : fallbackWatchlist;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const sym = symbolInput.trim().toUpperCase();
    if (!sym) return;

    try {
      await addToWatchlist.mutateAsync({ data: { symbol: sym } });

      toast({ title: `Added ${sym} to watchlist` });

      setSymbolInput("");

      queryClient.invalidateQueries({
        queryKey: ["/api/account/watchlist"],
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/account/dashboard"],
      });
    } catch (err: any) {
      toast({
        title: "Failed to add",
        description: err?.message || "Symbol may be invalid",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (e: React.MouseEvent, symbol: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await removeFromWatchlist.mutateAsync({ symbol });

      toast({ title: `Removed ${symbol}` });

      queryClient.invalidateQueries({
        queryKey: ["/api/account/watchlist"],
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/account/dashboard"],
      });
    } catch {
      toast({
        title: "Failed to remove",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Watchlist
        </h1>
        <p className="text-muted-foreground">Monitor your favorite assets</p>
      </div>

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Add symbol (e.g. AAPL)"
                className="pl-9"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={!symbolInput.trim() || addToWatchlist.isPending}
            >
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : watchlist.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 border rounded-lg border-dashed">
            Your watchlist is empty. Add symbols above to track them here.
          </div>
        ) : (
          watchlist.map((quote) => {
            const symbol = quote.symbol || "N/A";
            const name = quote.name || "Unknown Asset";
            const price =
              typeof quote.price === "number" ? quote.price : 0;
            const change =
              typeof quote.change === "number" ? quote.change : 0;
            const changePercent =
              typeof quote.changePercent === "number"
                ? quote.changePercent
                : 0;

            return (
              <Link key={symbol} href={`/markets/${symbol}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer group relative overflow-hidden">
                  <CardContent className="p-5">
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, symbol)}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-lg">{symbol}</div>
                        <div className="text-xs text-muted-foreground truncate w-32">
                          {name}
                        </div>
                      </div>

                      {change >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-success" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-destructive" />
                      )}
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="text-2xl font-bold">
                        {formatCurrency(price)}
                      </div>

                      <div
                        className={`font-medium text-sm ${
                          change >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {formatChange(changePercent, true)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}