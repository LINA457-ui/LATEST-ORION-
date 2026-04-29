import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Search } from "lucide-react";

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => adminApi.orders(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (o) =>
        o.symbol.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        (o.userEmail ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Orders</h1>
        <p className="text-muted-foreground mt-1">Most recent 200 orders across every user.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by symbol, user name, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading..." : `${filtered.length} order${filtered.length === 1 ? "" : "s"}`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isError ? (
            <div className="p-6 text-destructive">Failed to load orders.</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-muted-foreground">No orders.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">When</th>
                    <th className="text-left font-medium px-4 py-2">User</th>
                    <th className="text-left font-medium px-4 py-2">Side</th>
                    <th className="text-left font-medium px-4 py-2">Symbol</th>
                    <th className="text-right font-medium px-4 py-2">Qty</th>
                    <th className="text-right font-medium px-4 py-2">Price</th>
                    <th className="text-right font-medium px-4 py-2">Total</th>
                    <th className="text-left font-medium px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/users/${encodeURIComponent(o.userId)}`} className="hover:underline">
                          <div className="font-medium">{o.userName}</div>
                          <div className="text-xs text-muted-foreground">{o.userEmail ?? "—"}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={o.side === "buy" ? "default" : "destructive"} className="uppercase">{o.side}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold">{o.symbol}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{o.quantity.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(o.price)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{formatCurrency(o.total)}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
