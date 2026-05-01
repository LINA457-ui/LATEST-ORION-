import { useEffect, useState } from "react";
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
  });

  const account = data?.account;
  const shownTotalEquity =
  account?.displayedTotalEquity ?? account?.totalEquity ?? 0;

const shownPortfolioValue =
  account?.displayedPortfolioValue ?? account?.portfolioValue ?? 0;

const shownBuyingPower =
  account?.displayedBuyingPower ?? account?.buyingPower ?? account?.cashBalance ?? 0;

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
      account.overrides?.equity != null ? String(account.overrides.equity) : "",
    );

    setMarketValue(
      account.overrides?.marketValue != null
        ? String(account.overrides.marketValue)
        : "",
    );

    setBuyingPower(
      account.overrides?.buyingPower != null
        ? String(account.overrides.buyingPower)
        : "",
    );

    setDayChange(
      account.overrides?.dayChange != null
        ? String(account.overrides.dayChange)
        : "",
    );

    setDayChangePercent(
      account.overrides?.dayChangePercent != null
        ? String(account.overrides.dayChangePercent)
        : "",
    );
  }, [account]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "transactions"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
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

    await queryClient.invalidateQueries({
      queryKey: ["admin", "user", userId],
    });

    await queryClient.refetchQueries({
      queryKey: ["admin", "user", userId],
    });

    alert("Cash balance updated.");
  },

  onError: (error) => {
    console.error("Cash update failed:", error);
    alert(error instanceof Error ? error.message : "Failed to update cash balance.");
  },
});

const updateOverridesMutation = useMutation({
  mutationFn: async () => {
    const payload = {
      equity: nullableNumber(equity),
      marketValue: nullableNumber(marketValue),
      buyingPower: nullableNumber(buyingPower),
      dayChange: nullableNumber(dayChange),
      dayChangePercent: nullableNumber(dayChangePercent),
    };

    console.log("🚀 SENDING OVERRIDES:", payload);

    return adminApi.updateOverrides(userId, payload);
  },

  onSuccess: async () => {
    console.log("✅ SAVED SUCCESSFULLY");

    await queryClient.invalidateQueries({
      queryKey: ["admin", "user", userId],
    });

    await queryClient.refetchQueries({
      queryKey: ["admin", "user", userId],
    });

    alert("Overrides saved!");
  },

  onError: (err) => {
    console.error("❌ ERROR:", err);
    alert(err instanceof Error ? err.message : "Failed to save overrides");
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
      if (!holdingSymbol.trim()) {
        throw new Error("Symbol is required");
      }

      if (!holdingQuantity || Number(holdingQuantity) <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      if (holdingAverageCost === "" || Number(holdingAverageCost) < 0) {
        throw new Error("Average cost is required");
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
    mutationFn: () =>
      adminApi.createTransaction(userId, {
        type: txType,
        description: txDescription,
        amount: Number(txAmount),
        symbol: txSymbol.trim() || null,
        createdAt: new Date(txCreatedAt).toISOString(),
      }),
    onSuccess: async () => {
      setTxDescription("");
      setTxAmount("");
      setTxSymbol("");
      await invalidate();
      alert("Transaction added.");
    },
    onError: (error) => {
      console.error("Transaction save failed:", error);
      alert("Failed to add transaction.");
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
                  alt={account.displayName}
                  className="h-16 w-16 rounded-full border object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                  {account.displayName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold">{account.displayName}</h1>
                <p className="text-sm text-muted-foreground">
                  {account.email ?? "No email"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {account.userId}
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

            <Button variant="outline" onClick={() => invalidate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
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

        <CardContent className="grid gap-4 md:grid-cols-5">
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

          <div className="md:col-span-5 flex gap-2">
            <Button
  type="button"
  onClick={(e) => {
    e.preventDefault();

    console.log("🔥 SAVE BUTTON CLICKED");

    updateOverridesMutation.mutate();
  }}
>
  Save Overrides
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
          <CardTitle>Holdings ({data.positions.length})</CardTitle>
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

          {data.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Symbol</th>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Avg Cost</th>
                    <th className="text-right px-4 py-2">Current Price</th>
                    <th className="text-right px-4 py-2">Market Value</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p: any) => (
                    <tr key={p.symbol} className="border-t">
                      <td className="px-4 py-2 font-mono font-semibold">
                        {p.symbol}
                      </td>
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 text-right">
                        {p.quantity.toFixed(4)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(p.averageCost)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(p.currentPrice)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(p.marketValue)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteHoldingMutation.mutate(p.symbol)}
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
    </div>
  );
}