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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Trash2, AlertCircle, Sparkles, Plus } from "lucide-react";

const TX_TYPES = [
  "deposit",
  "withdrawal",
  "buy",
  "sell",
  "dividend",
  "fee",
  "interest",
  "transfer",
  "adjustment",
];

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

  // Override form state
  const [ovEquity, setOvEquity] = useState("");
  const [ovMarket, setOvMarket] = useState("");
  const [ovBuying, setOvBuying] = useState("");
  const [ovChange, setOvChange] = useState("");
  const [ovChangePct, setOvChangePct] = useState("");

  // New transaction form state
  const [txType, setTxType] = useState("deposit");
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txSymbol, setTxSymbol] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 16));

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

  const overridesMut = useMutation({
    mutationFn: (
      body: Parameters<typeof adminApi.setOverrides>[1],
    ) => adminApi.setOverrides(userId, body),
    onSuccess: () => {
      toast({ title: "Display values saved" });
      setOvEquity("");
      setOvMarket("");
      setOvBuying("");
      setOvChange("");
      setOvChangePct("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
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
      qc.invalidateQueries({ queryKey: ["admin", "check"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const createTxMut = useMutation({
    mutationFn: () =>
      adminApi.createTransaction(userId, {
        type: txType,
        description: txDesc,
        amount: Number(txAmount),
        symbol: txSymbol || null,
        createdAt: txDate ? new Date(txDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast({ title: "Transaction added" });
      setTxDesc("");
      setTxAmount("");
      setTxSymbol("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteTxMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteTransaction(id),
    onSuccess: () => {
      toast({ title: "Transaction removed" });
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "transactions"] });
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
  const ov = a.overrides;
  const initials = (a.displayName?.[0] ?? "U").toUpperCase();

  function parseOptional(v: string): number | null | undefined {
    if (v.trim() === "") return undefined;
    if (v.trim().toLowerCase() === "clear" || v.trim().toLowerCase() === "null") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  function applyOverrides() {
    const body: Parameters<typeof adminApi.setOverrides>[1] = {};
    const e = parseOptional(ovEquity);
    const m = parseOptional(ovMarket);
    const b = parseOptional(ovBuying);
    const c = parseOptional(ovChange);
    const p = parseOptional(ovChangePct);
    if (e !== undefined) body.equity = e;
    if (m !== undefined) body.marketValue = m;
    if (b !== undefined) body.buyingPower = b;
    if (c !== undefined) body.dayChange = c;
    if (p !== undefined) body.dayChangePercent = p;
    if (Object.keys(body).length === 0) {
      toast({ title: "Nothing to save", description: "Enter values or 'clear' to remove an override." });
      return;
    }
    overridesMut.mutate(body);
  }

  function clearAllOverrides() {
    overridesMut.mutate({
      equity: null,
      marketValue: null,
      buyingPower: null,
      dayChange: null,
      dayChangePercent: null,
    });
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border">
            {a.avatarUrl && <AvatarImage src={a.avatarUrl} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{a.displayName}</h1>
            <p className="text-muted-foreground mt-1">{a.email ?? "No email on file"}</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">{a.userId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.isAdmin && <Badge>Admin</Badge>}
          {a.isSuspended && <Badge variant="destructive">Suspended</Badge>}
          {!a.isAdmin && !a.isSuspended && <Badge variant="secondary">Active</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DisplayedStat label="Total Equity" value={a.displayedTotalEquity} overridden={ov.equity != null} />
        <DisplayedStat label="Market Value" value={a.displayedPortfolioValue} overridden={ov.marketValue != null} />
        <DisplayedStat label="Cash Balance" value={a.cashBalance} />
        <DisplayedStat label="Buying Power" value={a.displayedBuyingPower} overridden={ov.buyingPower != null} />
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Display value overrides
          </CardTitle>
          <CardDescription>
            Lock the figures shown on this user's dashboard. Leave a field blank to keep its current setting.
            Type <span className="font-mono">clear</span> to remove an existing override and revert to live calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <OverrideInput
              label="Total Equity ($)"
              value={ovEquity}
              onChange={setOvEquity}
              current={ov.equity}
            />
            <OverrideInput
              label="Market Value ($)"
              value={ovMarket}
              onChange={setOvMarket}
              current={ov.marketValue}
            />
            <OverrideInput
              label="Buying Power ($)"
              value={ovBuying}
              onChange={setOvBuying}
              current={ov.buyingPower}
            />
            <OverrideInput
              label="Day Change ($)"
              value={ovChange}
              onChange={setOvChange}
              current={ov.dayChange}
            />
            <OverrideInput
              label="Day Change (%)"
              value={ovChangePct}
              onChange={setOvChangePct}
              current={ov.dayChangePercent}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={applyOverrides} disabled={overridesMut.isPending}>
              {overridesMut.isPending ? "Saving..." : "Save overrides"}
            </Button>
            <Button variant="outline" onClick={clearAllOverrides} disabled={overridesMut.isPending}>
              Clear all overrides
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            When an override is set, that value persists across deploys and ignores
            the live market simulator. The cash balance is set in "Adjust Cash Balance" below.
          </p>
        </CardContent>
      </Card>

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
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove holding ${p.symbol}`}
                          title={`Remove holding ${p.symbol}`}
                          onClick={() => {
                            if (confirm(`Remove ${p.symbol}?`)) deleteHoldingMut.mutate(p.symbol);
                          }}
                        >
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

      <Card>
        <CardHeader>
          <CardTitle>Add a transaction</CardTitle>
          <CardDescription>
            Hand-create historical transactions (deposit, dividend, fee, buy/sell, etc.) with any date you choose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTxMut.mutate();
            }}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-2">
              <Label>Type</Label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Label>Date / time</Label>
              <Input
                type="datetime-local"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-4">
              <Label>Description</Label>
              <Input
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                placeholder="e.g. PFE dividend payout"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="44.74 or -1.05"
              />
            </div>
            <div className="md:col-span-1">
              <Label>Symbol</Label>
              <Input
                value={txSymbol}
                onChange={(e) => setTxSymbol(e.target.value.toUpperCase())}
                placeholder="opt"
                maxLength={10}
              />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button
                type="submit"
                disabled={!txDesc.trim() || !txAmount || createTxMut.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                {createTxMut.isPending ? "Saving..." : "Add transaction"}
              </Button>
            </div>
          </form>
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
          <CardHeader>
            <CardTitle>Recent Transactions ({data.recentTransactions.length})</CardTitle>
            <CardDescription>Click the trash icon to delete a transaction.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No transactions yet.</p>
            ) : (
              <div className="divide-y max-h-[480px] overflow-y-auto">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2 text-sm gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{t.type}</Badge>
                        {t.symbol && <span className="font-mono text-xs text-muted-foreground">{t.symbol}</span>}
                      </div>
                      <div className="truncate mt-1">{t.description}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={`tabular-nums font-semibold ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete transaction ${t.id}`}
                      title="Delete this transaction"
                      onClick={() => {
                        if (confirm("Remove this transaction?")) deleteTxMut.mutate(t.id);
                      }}
                      disabled={deleteTxMut.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
            aria-label="Permanently delete user account"
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

function DisplayedStat({
  label,
  value,
  overridden,
}: {
  label: string;
  value: number;
  overridden?: boolean;
}) {
  return (
    <Card className={overridden ? "border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
          <span>{label}</span>
          {overridden && (
            <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
              OVERRIDE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}

function OverrideInput({
  label,
  value,
  onChange,
  current,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  current: number | null;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          current !== null ? `current: ${current}` : "(live)"
        }
      />
    </div>
  );
}
