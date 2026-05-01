import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminApi } from "@/lib/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import {
  Users,
  DollarSign,
  BarChart3,
  Activity,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export default function AdminOverviewPage() {
  useEffect(() => {
    adminApi.syncMe().catch(console.error);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <h2 className="font-semibold">Dashboard could not load</h2>
        <p className="text-sm mt-1">
          {(error as Error)?.message || "Please refresh after signing in."}
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Users",
      value: Number(data.totalUsers || 0).toLocaleString(),
      icon: Users,
      sub: `${data.signupsToday || 0} today, ${data.signupsThisWeek || 0} this week`,
    },
    {
      label: "Assets Under Management",
      value: formatCurrency(data.totalAum || 0),
      icon: DollarSign,
      sub: `${formatCurrency(data.totalCash || 0)} cash + ${formatCurrency(
        data.totalPortfolioValue || 0
      )} positions`,
    },
    {
      label: "Total Trade Volume",
      value: formatCurrency(data.totalVolume || 0),
      icon: BarChart3,
      sub: `${Number(data.totalOrders || 0).toLocaleString()} orders`,
    },
    {
      label: "Account Status",
      value: `${data.adminUsers || 0} admin · ${data.suspendedUsers || 0} suspended`,
      icon: data.suspendedUsers > 0 ? ShieldAlert : ShieldCheck,
      sub: "Across all users",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">
          System-wide statistics for Orion Investment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
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
            <CardTitle>Top Holdings</CardTitle>
            <CardDescription>Most-held symbols by market value</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.topHoldings?.length ? (
              <p className="text-sm text-muted-foreground">No holdings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topHoldings.map((h: any) => (
                  <div
                    key={h.symbol}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="font-mono font-semibold">{h.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.name}
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums">
                      {formatCurrency(h.totalValue)}
                    </div>
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
            <Link href="/admin/users" className="flex justify-between py-2 px-3 rounded-md hover:bg-muted">
              <span>Manage Users</span>
              <span className="text-xs text-muted-foreground">{data.totalUsers}</span>
            </Link>

            <Link href="/admin/orders" className="flex justify-between py-2 px-3 rounded-md hover:bg-muted">
              <span>All Orders</span>
              <span className="text-xs text-muted-foreground">{data.totalOrders}</span>
            </Link>

            <Link href="/admin/transactions" className="flex justify-between py-2 px-3 rounded-md hover:bg-muted">
              <span>All Transactions</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(data.totalVolume || 0)}
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}