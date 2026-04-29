import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Trash2, AlertCircle } from "lucide-react";

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = decodeURIComponent(params.userId ?? "");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.user(userId),
    enabled: !!userId,
  });

  const [cashInput, setCashInput] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [holdingSymbol, setHoldingSymbol] = useState("");
  const [holdingQty, setHoldingQty] = useState("");
  const [holdingCost, setHoldingCost] = useState("");
  const [displayName, setDisplayName] = useState("");

  const setCashMut = useMutation({
    mutationFn: () => adminApi.setCash(userId, Number(cashInput), cashNote),
    onSuccess: (r) => {
      toast({ title: "Cash updated", description: `${formatCurrency(r.oldBalance)} → ${formatCurrency(r.newBalance)}` });
      setCashInput("");
      setCashNote("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const upsertHoldingMut = useMutation({
    mutationFn: () => adminApi.upsertHolding(userId, {
      symbol: holdingSymbol,
      quantity: Number(holdingQty),
      averageCost: Number(holdingCost),
    }),
    onSuccess: () => {
      toast({ title: "Holding saved" });
      setHoldingSymbol("");
      setHoldingQty("");
      setHoldingCost("");
      refetch();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteHoldingMut = useMutation({
    mutationFn: (symbol: string) => adminApi.deleteHolding(userId, symbol),
    onSuccess: () => { toast({ title: "Holding removed" }); refetch(); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateUserMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateUser>[1]) => adminApi.updateUser(userId, body),
    onSuccess: () => {
      toast({ title: "User updated" });
      setDisplayName("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      // If admin demoted themselves, re-check admin status so AdminRoute
      // can cleanly redirect them out of the admin section.
      qc.invalidateQueries({ queryKey: ["admin", "check"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteUserMut = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast({ title: "User deleted" });
      navigate("/admin/users");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-destructive">Failed to load user.</div>;
  }

  const a = data.account;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{a.displayName}</h1>
          <p className="text-muted-foreground mt-1">{a.email ?? "No email on file"}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{a.userId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.isAdmin && <Badge>Admin</Badge>}
          {a.isSuspended && <Badge variant="destructive">Suspended</Badge>}
          {!a.isAdmin && !a.isSuspended && <Badge variant="secondary">Active</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Equity</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(a.totalEquity)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cash Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(a.cashBalance)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Portfolio Value</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(a.portfolioValue)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Adjust Cash Balance</CardTitle>
            <CardDescription>Set a new total cash balance. The difference is logged as a transaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New cash balance (USD)</Label>
              <Input type="number" min="0" step="0.01" placeholder={String(a.cashBalance)} value={cashInput} onChange={(e) => setCashInput(e.target.value)} />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Promotional credit" value={cashNote} onChange={(e) => setCashNote(e.target.value)} />
            </div>
            <Button onClick={() => setCashMut.mutate()} disabled={!cashInput || setCashMut.isPending}>
              {setCashMut.isPending ? "Saving..." : "Update Cash"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Roles, suspension, and identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Admin access</div>
                <div className="text-xs text-muted-foreground">Allow this user into the admin section</div>
              </div>
              <Switch checked={a.isAdmin} onCheckedChange={(v) => updateUserMut.mutate({ isAdmin: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Suspend account</div>
                <div className="text-xs text-muted-foreground">Block this user from placing trades</div>
              </div>
              <Switch checked={a.isSuspended} onCheckedChange={(v) => updateUserMut.mutate({ isSuspended: v })} />
            </div>
            <div>
              <Label>Display name</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder={a.displayName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <Button variant="secondary" disabled={!displayName.trim() || updateUserMut.isPending} onClick={() => updateUserMut.mutate({ displayName: displayName.trim() })}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holdings ({data.positions.length})</CardTitle>
          <CardDescription>Add a new position or modify existing ones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-1">
              <Label>Symbol</Label>
              <Input placeholder="AAPL" value={holdingSymbol} onChange={(e) => setHoldingSymbol(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="0" step="0.000001" value={holdingQty} onChange={(e) => setHoldingQty(e.target.value)} />
            </div>
            <div>
              <Label>Avg Cost (USD)</Label>
              <Input type="number" min="0" step="0.0001" value={holdingCost} onChange={(e) => setHoldingCost(e.target.value)} />
            </div>
            <Button
              disabled={!holdingSymbol || !holdingQty || !holdingCost || upsertHoldingMut.isPending}
              onClick={() => upsertHoldingMut.mutate()}
            >
              {upsertHoldingMut.isPending ? "Saving..." : "Add / Update"}
            </Button>
          </div>

          {data.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Symbol</th>
                    <th className="text-right font-medium px-4 py-2">Qty</th>
                    <th className="text-right font-medium px-4 py-2">Avg Cost</th>
                    <th className="text-right font-medium px-4 py-2">Current</th>
                    <th className="text-right font-medium px-4 py-2">Market Value</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2">
                        <div className="font-mono font-semibold">{p.symbol}</div>
                        <div className="text-xs text-muted-foreground">{p.name}</div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.quantity.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.averageCost)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.currentPrice)}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatCurrency(p.marketValue)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm(`Remove ${p.symbol}?`)) deleteHoldingMut.mutate(p.symbol);
                        }}>
                          <Trash2 className="w-4 h-4" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No orders yet.</p>
            ) : (
              <div className="divide-y">
                {data.recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <span className={`font-mono uppercase font-semibold mr-2 ${o.side === "buy" ? "text-green-600" : "text-red-600"}`}>{o.side}</span>
                      <span className="font-mono">{o.symbol}</span> · {o.quantity}
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums">{formatCurrency(o.total)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No transactions yet.</p>
            ) : (
              <div className="divide-y">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <Badge variant="outline" className="mr-2">{t.type}</Badge>
                      {t.description}
                    </div>
                    <div className="text-right">
                      <div className={`tabular-nums font-semibold ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" /> Danger Zone</CardTitle>
          <CardDescription>Permanently delete this user's account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`PERMANENTLY delete ${a.displayName} (${a.email ?? a.userId}) and all their data? This cannot be undone.`)) {
                deleteUserMut.mutate();
              }
            }}
            disabled={deleteUserMut.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteUserMut.isPending ? "Deleting..." : "Delete user account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
