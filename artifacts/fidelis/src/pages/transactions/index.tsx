import { useState } from "react";
import { useListTransactions } from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  createdAt?: string | Date | null;
  type?: string | null;
  description?: string | null;
  amount?: number | null;
};

const fallbackTransactions: Transaction[] = [
  {
    id: "demo-1",
    createdAt: new Date().toISOString(),
    type: "deposit",
    description: "Initial account funding",
    amount: 10000,
  },
  {
    id: "demo-2",
    createdAt: new Date().toISOString(),
    type: "buy",
    description: "Bought AAPL shares",
    amount: -1200,
  },
  {
    id: "demo-3",
    createdAt: new Date().toISOString(),
    type: "dividend",
    description: "Dividend payout",
    amount: 85.5,
  },
];

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { data: transactionsData, isLoading } = useListTransactions();

  const transactions: Transaction[] = Array.isArray(transactionsData)
    ? transactionsData
    : fallbackTransactions;

  const filtered = transactions.filter((t) => {
    const type = t.type || "unknown";
    return typeFilter === "all" || type === typeFilter;
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-success/20 text-success border-success/30";
      case "buy":
        return "bg-primary/20 text-primary border-primary/30";
      case "sell":
        return "bg-muted text-foreground border-border";
      case "dividend":
        return "bg-success/20 text-success border-success/30";
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
          <CardTitle className="text-lg">History</CardTitle>

          <div className="w-40">
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
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>

                      <TableCell className="pr-6">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const type = t.type || "unknown";
                    const amount =
                      typeof t.amount === "number" ? t.amount : 0;

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="pl-6 text-muted-foreground whitespace-nowrap">
                          {t.createdAt
                            ? formatDateTime(t.createdAt as any)
                            : "N/A"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize ${getBadgeColor(type)}`}
                          >
                            {type}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-medium text-foreground/80">
                          {t.description || "No description"}
                        </TableCell>

                        <TableCell
                          className={`text-right pr-6 font-bold ${
                            amount >= 0 ? "text-success" : "text-foreground"
                          }`}
                        >
                          {amount > 0 ? "+" : ""}
                          {formatCurrency(amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}