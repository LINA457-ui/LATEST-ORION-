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

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "transactions"],
    queryFn: () => adminApi.transactions(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        (t.symbol ?? "").toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        (t.userEmail ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Transactions</h1>
        <p className="text-muted-foreground mt-1">Most recent 200 cash movements across every user.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by user, type, symbol, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading..." : `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isError ? (
            <div className="p-6 text-destructive">Failed to load transactions.</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-muted-foreground">No transactions.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">When</th>
                    <th className="text-left font-medium px-4 py-2">User</th>
                    <th className="text-left font-medium px-4 py-2">Type</th>
                    <th className="text-left font-medium px-4 py-2">Description</th>
                    <th className="text-right font-medium px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/users/${encodeURIComponent(t.userId)}`} className="hover:underline">
                          <div className="font-medium">{t.userName}</div>
                          <div className="text-xs text-muted-foreground">{t.userEmail ?? "—"}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-2"><Badge variant="outline">{t.type}</Badge></td>
                      <td className="px-4 py-2">{t.description}</td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount)}
                      </td>
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
