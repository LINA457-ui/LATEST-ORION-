import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Transaction = {
  id: string | number;
  type?: string | null;
  description?: string | null;
  symbol?: string | null;
  amount?: number | string | null;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
};

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => adminApi.transactions(),
    retry: 1,
  });

  const transactions: Transaction[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.transactions)
      ? (data as any).transactions
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];

  const filtered = transactions.filter((t) => {
    const type = String(t.type || "unknown").toLowerCase();
    return typeFilter === "all" || type === typeFilter;
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "dividend":
        return "bg-success/20 text-success border-success/30";
      case "buy":
        return "bg-primary/20 text-primary border-primary/30";
      case "sell":
        return "bg-muted text-foreground border-border";
      case "withdrawal":
      case "fee":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Transactions
        </h1>
        <p className="text-muted-foreground">Account history and activity</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">
            History ({filtered.length})
          </CardTitle>

          <div className="w-44">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="buy">Buys</SelectItem>
                <SelectItem value="sell">Sells</SelectItem>
                <SelectItem value="dividend">Dividends</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="fee">Fees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="border-t p-6 text-sm text-destructive">
              {(error as Error)?.message || "Failed to load transactions."}
            </div>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-6 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-56" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-3">
                          <Skeleton className="ml-auto h-4 w-24" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length ? (
                    filtered.map((t, index) => {
                      const type = String(t.type || "unknown").toLowerCase();
                      const amount = Number(t.amount ?? 0);
                      const createdAt = t.createdAt ?? t.created_at;
                      const symbol = t.symbol?.trim() || "—";

                      return (
                        <tr
                          key={t.id ?? index}
                          className="border-t transition hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
                            {createdAt
                              ? new Date(createdAt).toLocaleString()
                              : "—"}
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`capitalize ${getBadgeColor(type)}`}
                            >
                              {type}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 font-medium text-foreground">
                            {t.description || "—"}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs tracking-wide text-muted-foreground">
                            {symbol}
                          </td>

                          <td
                            className={`px-6 py-3 text-right text-sm font-semibold ${
                              amount > 0
                                ? "text-green-500"
                                : amount < 0
                                  ? "text-red-500"
                                  : "text-foreground"
                            }`}
                          >
                            {amount > 0 ? "+" : ""}
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}