import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  CheckCircle2,
  TrendingUp,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type Order = {
  id: string;
  symbol: string;
  name: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  status: "filled" | "pending";
  createdAt: string;
};

const quotes: Quote[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 198.42,
    change: 2.34,
    changePercent: 1.19,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 431.22,
    change: 4.18,
    changePercent: 0.98,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 122.88,
    change: 3.72,
    changePercent: 3.12,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 244.91,
    change: -2.16,
    changePercent: -0.87,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 187.35,
    change: 1.44,
    changePercent: 0.77,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 171.26,
    change: -0.82,
    changePercent: -0.48,
  },
];

const initialOrders: Order[] = [
  {
    id: "ord-1",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    side: "buy",
    quantity: 50,
    price: 122.88,
    total: 6144,
    status: "filled",
    createdAt: "2026-05-01T10:45:00",
  },
  {
    id: "ord-2",
    symbol: "AAPL",
    name: "Apple Inc.",
    side: "buy",
    quantity: 25,
    price: 198.42,
    total: 4960.5,
    status: "filled",
    createdAt: "2026-04-30T13:20:00",
  },
];

export default function TradePage() {
  const [search, setSearch] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isOrdering, setIsOrdering] = useState(false);

  const { toast } = useToast();

  const selectedQuote =
    quotes.find((quote) => quote.symbol === selectedSymbol) || quotes[0];

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return quotes;

    return quotes.filter(
      (quote) =>
        quote.symbol.toLowerCase().includes(query) ||
        quote.name.toLowerCase().includes(query)
    );
  }, [search]);

  const qty = Number(quantity);
  const estimatedTotal = selectedQuote.price * (Number.isFinite(qty) ? qty : 0);
  const cashBalance = 4000000;
  const buyingPower = 400000000;
  const commission = estimatedTotal > 0 ? 1.5 : 0;
  const finalTotal = estimatedTotal + commission;
  const canPlaceOrder = selectedQuote && qty > 0 && finalTotal <= buyingPower;

  const handleTrade = () => {
    if (!canPlaceOrder) {
      toast({
        title: "Invalid order",
        description: "Please select a symbol and enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsOrdering(true);

    setTimeout(() => {
      const newOrder: Order = {
        id: crypto.randomUUID(),
        symbol: selectedQuote.symbol,
        name: selectedQuote.name,
        side,
        quantity: qty,
        price: selectedQuote.price,
        total: estimatedTotal,
        status: "filled",
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => [newOrder, ...prev]);
      setIsOrdering(false);
      setQuantity("1");

      toast({
        title: "Order Placed",
        description: `${side.toUpperCase()} ${qty} shares of ${
          selectedQuote.symbol
        }`,
        action: <CheckCircle2 className="w-4 h-4 text-success" />,
      });
    }, 700);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">
            Trade
          </h1>
          <p className="text-muted-foreground">
            Place demo market orders with a clean static trading experience.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <Card className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="w-4 h-4" />
              Cash
            </div>
            <div className="font-bold">{formatCurrency(cashBalance)}</div>
          </Card>

          <Card className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Buying Power
            </div>
            <div className="font-bold">{formatCurrency(buyingPower)}</div>
          </Card>

          <Card className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4" />
              Risk
            </div>
            <div className="font-bold">Balanced</div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Market Watch</CardTitle>
            <CardDescription>
              Select a symbol to prepare your order.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search AAPL, TSLA, NVDA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredQuotes.map((quote) => {
                  const positive = quote.change >= 0;
                  const selected = quote.symbol === selectedQuote.symbol;

                  return (
                    <TableRow
                      key={quote.symbol}
                      onClick={() => setSelectedSymbol(quote.symbol)}
                      className={`cursor-pointer ${
                        selected ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          {quote.symbol}
                          {selected && <Badge>Selected</Badge>}
                        </div>
                      </TableCell>

                      <TableCell>{quote.name}</TableCell>

                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.price)}
                      </TableCell>

                      <TableCell
                        className={`text-right ${
                          positive ? "text-success" : "text-destructive"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {positive ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {quote.changePercent}%
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-fit sticky top-24">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Order Ticket</CardTitle>
            <CardDescription>
              {selectedQuote.symbol} · {selectedQuote.name}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                onClick={() => setSide("buy")}
                className={`rounded-md py-2 text-sm font-bold transition ${
                  side === "buy"
                    ? "bg-background text-success shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Buy
              </button>

              <button
                onClick={() => setSide("sell")}
                className={`rounded-md py-2 text-sm font-bold transition ${
                  side === "sell"
                    ? "bg-background text-destructive shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Sell
              </button>
            </div>

            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Symbol</span>
                <span className="font-bold">{selectedQuote.symbol}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-bold">
                  {formatCurrency(selectedQuote.price)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Order Type
                </span>
                <span className="font-bold">Market</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Value</span>
                <span>{formatCurrency(estimatedTotal || 0)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Demo Commission</span>
                <span>{formatCurrency(commission)}</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(finalTotal || 0)}</span>
              </div>
            </div>

            <Button
              onClick={handleTrade}
              disabled={!canPlaceOrder || isOrdering}
              variant={side === "buy" ? "default" : "destructive"}
              className="w-full h-12 font-bold"
            >
              {isOrdering
                ? "Processing..."
                : `Place ${side.toUpperCase()} Order`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Demo trade only. No real transaction will be executed.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>
            Your latest static demo trades appear here instantly.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-bold">{order.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.name}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={order.side === "buy" ? "default" : "destructive"}
                      className="uppercase"
                    >
                      {order.side}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {order.quantity}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatCurrency(order.price)}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">{order.status}</Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}