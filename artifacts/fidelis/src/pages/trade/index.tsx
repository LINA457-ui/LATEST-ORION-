import { useState } from "react";
import { useListQuotes, usePlaceOrder, useListOrders, useGetMyAccount } from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function TradePage() {
  const [search, setSearch] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [isOrdering, setIsOrdering] = useState(false);
  
  const { toast } = useToast();
  
  const { data: quotes } = useListQuotes();
  const { data: orders, isLoading: loadingOrders } = useListOrders();
  const { data: account } = useGetMyAccount();
  const placeOrder = usePlaceOrder();

  const selectedQuote = quotes?.find(q => q.symbol === selectedSymbol);
  
  const filteredQuotes = search && !selectedQuote ? quotes?.filter(q => 
    q.symbol.toLowerCase().includes(search.toLowerCase()) || 
    q.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5) : [];

  const handleTrade = async () => {
    if (!selectedQuote) return;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0 || isNaN(qty)) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }

    setIsOrdering(true);
    try {
      await placeOrder.mutateAsync({
        data: { symbol: selectedQuote.symbol, side, quantity: qty }
      });
      toast({ 
        title: "Order Placed", 
        description: `${side.toUpperCase()} ${qty} shares of ${selectedQuote.symbol}`,
        action: <CheckCircle2 className="w-4 h-4 text-success" />
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      
      setSelectedSymbol("");
      setQuantity("1");
      setSearch("");
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Trade</h1>
        <p className="text-muted-foreground">Execute market orders instantly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Order Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Symbol</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search symbols..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value.toUpperCase());
                    setSelectedSymbol("");
                  }}
                />
              </div>
              
              {filteredQuotes && filteredQuotes.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-10 overflow-hidden shadow-lg">
                  <div className="divide-y">
                    {filteredQuotes.map(q => (
                      <div 
                        key={q.symbol} 
                        className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          setSelectedSymbol(q.symbol);
                          setSearch(q.symbol);
                        }}
                      >
                        <div>
                          <div className="font-bold">{q.symbol}</div>
                          <div className="text-xs text-muted-foreground">{q.name}</div>
                        </div>
                        <div className="font-medium">{formatCurrency(q.price)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {selectedQuote && (
              <>
                <div className="p-4 bg-muted/30 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">{selectedQuote.symbol}</div>
                    <div className="text-sm text-muted-foreground">{selectedQuote.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(selectedQuote.price)}</div>
                  </div>
                </div>

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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Action</label>
                    <span className="font-medium">{side === 'buy' ? 'Buy' : 'Sell'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input 
                      type="number" 
                      min="0.01" 
                      step="0.01" 
                      className="w-32 text-right" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Order Type</label>
                    <span className="font-medium">Market</span>
                  </div>
                  
                  <div className="pt-4 border-t flex items-center justify-between">
                    <span className="font-bold">Estimated Total</span>
                    <span className="font-bold text-xl">{formatCurrency(selectedQuote.price * (parseFloat(quantity) || 0))}</span>
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
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/10 border-transparent md:border-border">
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent>
            {account && (
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-background rounded-md border">
                  <span className="text-muted-foreground">Available Cash</span>
                  <span className="font-bold">{formatCurrency(account.cashBalance)}</span>
                </div>
                <div className="flex justify-between p-3 bg-background rounded-md border">
                  <span className="text-muted-foreground">Buying Power</span>
                  <span className="font-bold">{formatCurrency(account.buyingPower)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOrders ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading orders...</TableCell>
                  </TableRow>
                ) : !orders?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No recent orders</TableCell>
                  </TableRow>
                ) : (
                  orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                      <TableCell className="font-bold">{order.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={order.side === 'buy' ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}>
                          {order.side.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{order.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.price)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="capitalize">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
