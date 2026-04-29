import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, Search } from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.users(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">All registered Orion accounts.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading..." : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <div className="p-6 text-destructive">Failed to load users.</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-muted-foreground">No users match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">User</th>
                    <th className="text-left font-medium px-4 py-2">Email</th>
                    <th className="text-right font-medium px-4 py-2">Equity</th>
                    <th className="text-right font-medium px-4 py-2">Cash</th>
                    <th className="text-right font-medium px-4 py-2">Positions</th>
                    <th className="text-left font-medium px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.userId} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{u.userId}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(u.totalEquity)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(u.cashBalance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.positionCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.isAdmin && <Badge variant="default">Admin</Badge>}
                          {u.isSuspended && <Badge variant="destructive">Suspended</Badge>}
                          {!u.isAdmin && !u.isSuspended && <Badge variant="secondary">Active</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/users/${encodeURIComponent(u.userId)}`}>
                            Manage <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
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
