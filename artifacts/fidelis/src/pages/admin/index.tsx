import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { Users, DollarSign, BarChart3, Activity, ShieldAlert, ShieldCheck } from "lucide-react";

export default function AdminOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-destructive">Failed to load admin overview.</div>;
  }

  const stats = [
    { label: "Total Users", value: data.totalUsers.toLocaleString(), icon: Users, sub: `${data.signupsToday} today, ${data.signupsThisWeek} this week` },
    { label: "Assets Under Management", value: formatCurrency(data.totalAum), icon: DollarSign, sub: `${formatCurrency(data.totalCash)} cash + ${formatCurrency(data.totalPortfolioValue)} positions` },
    { label: "Total Trade Volume", value: formatCurrency(data.totalVolume), icon: BarChart3, sub: `${data.totalOrders.toLocaleString()} orders` },
    { label: "Account Status", value: `${data.adminUsers} admin · ${data.suspendedUsers} suspended`, icon: data.suspendedUsers > 0 ? ShieldAlert : ShieldCheck, sub: "Across all users" },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">System-wide statistics for Orion Investment.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Holdings (System-Wide)</CardTitle>
            <CardDescription>Most-held symbols by combined market value</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topHoldings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holdings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topHoldings.map((h) => (
                  <div key={h.symbol} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="font-mono font-semibold">{h.symbol}</div>
                      <div className="text-xs text-muted-foreground">{h.name}</div>
                    </div>
                    <div className="font-semibold tabular-nums">{formatCurrency(h.totalValue)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump into management views</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users" className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted">
              <div className="flex items-center gap-3"><Users className="w-4 h-4" /><span>Manage Users</span></div>
              <span className="text-xs text-muted-foreground">{data.totalUsers}</span>
            </Link>
            <Link href="/admin/orders" className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted">
              <div className="flex items-center gap-3"><Activity className="w-4 h-4" /><span>All Orders</span></div>
              <span className="text-xs text-muted-foreground">{data.totalOrders}</span>
            </Link>
            <Link href="/admin/transactions" className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted">
              <div className="flex items-center gap-3"><BarChart3 className="w-4 h-4" /><span>All Transactions</span></div>
              <span className="text-xs text-muted-foreground">{formatCurrency(data.totalVolume)}</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
