import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from "lucide-react";

import { adminApi } from "@/lib/adminApi";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

function getUserIdFromPath() {
  const parts = window.location.pathname.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

function nullableNumber(value: string): number | null | undefined {
  const trimmed = value.trim();

  if (trimmed === "") return undefined;
  if (trimmed.toLowerCase() === "clear") return null;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid number");
  }

  return parsed;
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function getTransactions(data: any) {
  return safeArray<any>(
    data?.transactions ??
      data?.recentTransactions ??
      data?.account?.transactions ??
      data?.account?.recentTransactions ??
      data?.user?.transactions ??
      data?.user?.recentTransactions ??
      []
  );
}

export default function AdminUserDetail() {
  const userId = getUserIdFromPath();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [cashBalance, setCashBalance] = useState("");
  const [cashNote, setCashNote] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const [equity, setEquity] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [buyingPower, setBuyingPower] = useState("");
  const [dayChange, setDayChange] = useState("");
  const [dayChangePercent, setDayChangePercent] = useState("");

  const [holdingSymbol, setHoldingSymbol] = useState("AAPL");
  const [holdingQuantity, setHoldingQuantity] = useState("");
  const [holdingAverageCost, setHoldingAverageCost] = useState("");

  const [txType, setTxType] = useState("deposit");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txSymbol, setTxSymbol] = useState("");
  const [txCreatedAt, setTxCreatedAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.user(userId),
    enabled: Boolean(userId),
    staleTime: 0,
  });

  const account = data?.account ?? data?.user?.account ?? data?.user ?? null;

  const positions = useMemo(() => {
    return safeArray<any>(
      data?.positions ??
        data?.holdings ??
        data?.account?.positions ??
        data?.account?.holdings ??
        []
    );
  }, [data]);

  const transactions = useMemo(() => getTransactions(data), [data]);

  const shownTotalEquity =
    account?.displayedTotalEquity ?? account?.totalEquity ?? 0;

  const shownPortfolioValue =
    account?.displayedPortfolioValue ?? account?.portfolioValue ?? 0;

  const shownBuyingPower =
    account?.displayedBuyingPower ??
    account?.buyingPower ??
    account?.cashBalance ??
    0;

  const shownCashBalance = account?.cashBalance ?? 0;

  useEffect(() => {
    if (!account) return;

    setDisplayName(account.displayName ?? "");
    setEmail(account.email ?? "");
    setAvatarUrl(account.avatarUrl ?? "");

    setCashBalance(String(account.cashBalance ?? 0));

    setIsAdmin(Boolean(account.isAdmin));
    setIsSuspended(Boolean(account.isSuspended));

    setEquity(
      account.overrides?.equity != null ? String(account.overrides.equity) : ""
    );

    setMarketValue(
      account.overrides?.marketValue != null
        ? String(account.overrides.marketValue)
        : ""
    );

    setBuyingPower(
      account.overrides?.buyingPower != null
        ? String(account.overrides.buyingPower)
        : ""
    );

    setDayChange(
      account.overrides?.dayChange != null
        ? String(account.overrides.dayChange)
        : ""
    );

    setDayChangePercent(
      account.overrides?.dayChangePercent != null
        ? String(account.overrides.dayChangePercent)
        : ""
    );
  }, [account]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
    ]);

    await queryClient.refetchQueries({
      queryKey: ["admin", "user", userId],
      type: "active",
    });
  };

  const updateAccountMutation = useMutation({
    mutationFn: () =>
      adminApi.updateUser(userId, {
        displayName,
        email,
        avatarUrl,
        isAdmin,
        isSuspended,
      }),
    onSuccess: async () => {
      await invalidate();
      alert("Account details saved.");
    },
    onError: (error) => {
      console.error("Account save failed:", error);
      alert("Failed to save account details.");
    },
  });

  const updateCashMutation = useMutation({
    mutationFn: () => {
      const nextCash = Number(cashBalance);

      if (!Number.isFinite(nextCash) || nextCash < 0) {
        throw new Error("Enter a valid cash balance.");
      }

      return adminApi.updateCash(userId, {
        cashBalance: nextCash,
        note: cashNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setCashNote("");
      await invalidate();
      alert("Cash balance updated.");
    },
    onError: (error) => {
      console.error("Cash update failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update cash balance."
      );
    },
  });

  const updateOverridesMutation = useMutation({
    mutationFn: () =>
      adminApi.updateOverrides(userId, {
        equity: nullableNumber(equity),
        marketValue: nullableNumber(marketValue),
        buyingPower: nullableNumber(buyingPower),
        dayChange: nullableNumber(dayChange),
        dayChangePercent: nullableNumber(dayChangePercent),
      }),
    onSuccess: async () => {
      await invalidate();
      alert("Overrides saved.");
    },
    onError: (error) => {
      console.error("Overrides save failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save overrides.");
    },
  });

  const clearOverridesMutation = useMutation({
    mutationFn: () =>
      adminApi.updateOverrides(userId, {
        equity: null,
        marketValue: null,
        buyingPower: null,
        dayChange: null,
        dayChangePercent: null,
      }),
    onSuccess: async () => {
      setEquity("");
      setMarketValue("");
      setBuyingPower("");
      setDayChange("");
      setDayChangePercent("");
      await invalidate();
      alert("Overrides cleared.");
    },
    onError: (error) => {
      console.error("Clear overrides failed:", error);
      alert("Failed to clear overrides.");
    },
  });

  const addHoldingMutation = useMutation({
    mutationFn: () => {
      if (!holdingSymbol.trim()) throw new Error("Symbol is required.");
      if (!holdingQuantity || Number(holdingQuantity) <= 0) {
        throw new Error("Quantity must be greater than 0.");
      }
      if (holdingAverageCost === "" || Number(holdingAverageCost) < 0) {
        throw new Error("Average cost is required.");
      }

      return adminApi.upsertHolding(userId, {
        symbol: holdingSymbol.trim().toUpperCase(),
        quantity: Number(holdingQuantity),
        averageCost: Number(holdingAverageCost),
      });
    },
    onSuccess: async () => {
      setHoldingQuantity("");
      setHoldingAverageCost("");
      await invalidate();
      alert("Holding saved.");
    },
    onError: (error) => {
      console.error("Holding save failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save holding.");
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: (symbol: string) => adminApi.deleteHolding(userId, symbol),
    onSuccess: async () => {
      await invalidate();
      alert("Holding deleted.");
    },
    onError: (error) => {
      console.error("Delete holding failed:", error);
      alert("Failed to delete holding.");
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: () => {
      const amount = Number(txAmount);

      if (!Number.isFinite(amount)) {
        throw new Error("Enter a valid transaction amount.");
      }

      if (!txCreatedAt) {
        throw new Error("Transaction date is required.");
      }

      const finalDescription =
        txDescription.trim() ||
        `${txType.charAt(0).toUpperCase()}${txType.slice(1)} transaction`;

      return adminApi.createTransaction(userId, {
        type: txType,
        description: finalDescription,
        amount,
        symbol: txSymbol.trim() ? txSymbol.trim().toUpperCase() : null,
        createdAt: new Date(txCreatedAt).toISOString(),
      });
    },
    onSuccess: async () => {
      setTxDescription("");
      setTxAmount("");
      setTxSymbol("");
      await invalidate();
      alert("Transaction added.");
    },
    onError: (error) => {
      console.error("Transaction save failed:", error);
      alert(error instanceof Error ? error.message : "Failed to add transaction.");
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTransaction(id),
    onSuccess: async () => {
      await invalidate();
      alert("Transaction deleted.");
    },
    onError: (error) => {
      console.error("Delete transaction failed:", error);
      alert("Failed to delete transaction.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: () => navigate("/admin/users"),
    onError: (error) => {
      console.error("Delete user failed:", error);
      alert("Failed to delete user.");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !data || !account) {
    return (
      <div className="space-y-6 pb-8">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card>
          <CardContent className="p-6 text-destructive">
            Failed to load this user.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt={account.displayName ?? "User"}
                  className="h-16 w-16 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-bold">
                  {account.displayName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold">
                  {account.displayName ?? "User"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {account.email ?? "No email"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {account.userId ?? userId}
                </p>

                <div className="mt-3 flex gap-2">
                  {account.isAdmin && (
                    <Badge>
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}

                  {account.isSuspended && (
                    <Badge variant="destructive">
                      <Ban className="mr-1 h-3 w-3" />
                      Suspended
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => invalidate()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Delete this user permanently?")) {
                    deleteUserMutation.mutate();
                  }
                }}
                disabled={deleteUserMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-bold">
              {formatCurrency(shownTotalEquity)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Market Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(shownPortfolioValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Cash Balance</p>
            <p className="text-2xl font-bold">
              {formatCurrency(shownCashBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Buying Power</p>
            <p className="text-2xl font-bold">
              {formatCurrency(shownBuyingPower)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            These details are saved in your database and displayed across admin
            pages.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />

            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Avatar URL"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Admin Access</p>
              <p className="text-sm text-muted-foreground">
                Allow this user into the admin section.
              </p>
            </div>
            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Suspend Account</p>
              <p className="text-sm text-muted-foreground">
                Block this user from placing trades.
              </p>
            </div>
            <Switch checked={isSuspended} onCheckedChange={setIsSuspended} />
          </div>

          <Button
            onClick={() => updateAccountMutation.mutate()}
            disabled={updateAccountMutation.isPending}
          >
            {updateAccountMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Account Details
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Value Overrides</CardTitle>
          <p className="text-sm text-muted-foreground">
            These are the values this user will see on their dashboard. Leave
            blank for live calculation. Type <b>clear</b> to remove one.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              placeholder="Total Equity"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
            />

            <Input
              placeholder="Market Value"
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
            />

            <Input
              placeholder="Buying Power"
              value={buyingPower}
              onChange={(e) => setBuyingPower(e.target.value)}
            />

            <Input
              placeholder="Day Change"
              value={dayChange}
              onChange={(e) => setDayChange(e.target.value)}
            />

            <Input
              placeholder="Day Change %"
              value={dayChangePercent}
              onChange={(e) => setDayChangePercent(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => updateOverridesMutation.mutate()}
              disabled={updateOverridesMutation.isPending}
            >
              {updateOverridesMutation.isPending ? "Saving..." : "Save Overrides"}
            </Button>

            <Button
              variant="outline"
              onClick={() => clearOverridesMutation.mutate()}
              disabled={clearOverridesMutation.isPending}
            >
              Clear All Overrides
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adjust Cash Balance</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input
            type="number"
            placeholder="New cash balance"
            value={cashBalance}
            onChange={(e) => setCashBalance(e.target.value)}
          />

          <Input
            placeholder="Note optional"
            value={cashNote}
            onChange={(e) => setCashNote(e.target.value)}
          />

          <Button
            onClick={() => updateCashMutation.mutate()}
            disabled={updateCashMutation.isPending}
          >
            {updateCashMutation.isPending ? "Updating..." : "Update Cash"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holdings ({positions.length})</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Symbol"
              value={holdingSymbol}
              onChange={(e) => setHoldingSymbol(e.target.value.toUpperCase())}
            />

            <Input
              type="number"
              placeholder="Quantity"
              value={holdingQuantity}
              onChange={(e) => setHoldingQuantity(e.target.value)}
            />

            <Input
              type="number"
              placeholder="Avg Cost"
              value={holdingAverageCost}
              onChange={(e) => setHoldingAverageCost(e.target.value)}
            />

            <Button
              onClick={() => addHoldingMutation.mutate()}
              disabled={addHoldingMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add / Update
            </Button>
          </div>

          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Symbol</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Avg Cost</th>
                    <th className="px-4 py-2 text-right">Current Price</th>
                    <th className="px-4 py-2 text-right">Market Value</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>

                <tbody>
                  {positions.map((p: any) => (
                    <tr key={p.symbol} className="border-t">
                      <td className="px-4 py-2 font-mono font-semibold">
                        {p.symbol}
                      </td>

                      <td className="px-4 py-2">{p.name ?? "—"}</td>

                      <td className="px-4 py-2 text-right">
                        {Number(p.quantity ?? 0).toFixed(4)}
                      </td>

                      <td className="px-4 py-2 text-right">
                        {formatCurrency(Number(p.averageCost ?? 0))}
                      </td>

                      <td className="px-4 py-2 text-right">
                        {formatCurrency(Number(p.currentPrice ?? 0))}
                      </td>

                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(Number(p.marketValue ?? 0))}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            deleteHoldingMutation.mutate(String(p.symbol))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
          <CardTitle>Transaction Upload / History ({transactions.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add deposits, buys, sells, dividends, fees, or withdrawals for this
            user.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-6">
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="deposit">Deposit</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="fee">Fee</option>
            </select>

            <Input
              placeholder="Description"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="md:col-span-2"
            />

            <Input
              type="number"
              placeholder="Amount e.g 10000 or -1200"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />

            <Input
              placeholder="Symbol optional"
              value={txSymbol}
              onChange={(e) => setTxSymbol(e.target.value.toUpperCase())}
            />

            <Input
              type="datetime-local"
              value={txCreatedAt}
              onChange={(e) => setTxCreatedAt(e.target.value)}
            />

            <div className="flex flex-wrap gap-2 md:col-span-6">
              <Button
                onClick={() => addTransactionMutation.mutate()}
                disabled={addTransactionMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addTransactionMutation.isPending
                  ? "Adding..."
                  : "Add Transaction"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTxType("deposit");
                  setTxDescription("Initial account funding");
                  setTxAmount("10000");
                  setTxSymbol("");
                }}
              >
                Prefill Deposit
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTxType("buy");
                  setTxDescription("Bought AAPL shares");
                  setTxAmount("-1200");
                  setTxSymbol("AAPL");
                }}
              >
                Prefill Buy
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTxType("dividend");
                  setTxDescription("Dividend payout");
                  setTxAmount("85.5");
                  setTxSymbol("AAPL");
                }}
              >
                Prefill Dividend
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Symbol</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>

              <tbody>
                {transactions.length ? (
                  transactions.map((t: any, index: number) => {
                    const amount = Number(t.amount ?? 0);
                    const createdAt = t.createdAt ?? t.created_at;
                    const rowId = t.id ?? `${createdAt}-${index}`;

                    return (
                      <tr key={rowId} className="border-t">
                        <td className="px-4 py-2">
                          {createdAt ? new Date(createdAt).toLocaleString() : "—"}
                        </td>

                        <td className="px-4 py-2">
                          <Badge variant="secondary" className="capitalize">
                            {t.type ?? "transaction"}
                          </Badge>
                        </td>

                        <td className="px-4 py-2">{t.description ?? "—"}</td>

                        <td className="px-4 py-2 font-mono">
                          {t.symbol || "—"}
                        </td>

                        <td
                          className={`px-4 py-2 text-right font-semibold ${
                            amount >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {amount >= 0 ? "+" : ""}
                          {formatCurrency(amount)}
                        </td>

                        <td className="px-4 py-2 text-right">
                          {t.id ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={deleteTransactionMutation.isPending}
                              onClick={() =>
                                deleteTransactionMutation.mutate(Number(t.id))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No transactions uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}