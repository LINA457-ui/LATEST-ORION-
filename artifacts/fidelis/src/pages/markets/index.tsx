import { useState } from "react";
import { useListQuotes, useGetMarketMovers, useGetMarketIndices, useGetMarketNews } from "@workspace/api-client-react";
import { formatCurrency, formatChange, formatCompact } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  
  const { data: quotes, isLoading: loadingQuotes } = useListQuotes();
  const { data: movers, isLoading: loadingMovers } = useGetMarketMovers();
  const { data: indices, isLoading: loadingIndices } = useGetMarketIndices();
  const { data: news, isLoading: loadingNews } = useGetMarketNews();

  const filteredQuotes = quotes?.filter(q => 
    q.symbol.toLowerCase().includes(search.toLowerCase()) || 
    q.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground">Market research, quotes, and breaking news</p>
      </div>

      {/* Indices Ticker Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingIndices ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          indices?.map(idx => (
            <Card key={idx.symbol}>
              <CardContent className="p-4">
                <div className="text-sm font-bold text-muted-foreground mb-1">{idx.name}</div>
                <div className="text-xl font-bold">{formatCurrency(idx.value)}</div>
                <div className={`text-sm font-medium ${idx.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatChange(idx.change)} ({formatChange(idx.changePercent, true)})
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Market Movers</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="gainers">
                <TabsList className="mb-4">
                  <TabsTrigger value="gainers" className="data-[state=active]:text-success">Top Gainers</TabsTrigger>
                  <TabsTrigger value="losers" className="data-[state=active]:text-destructive">Top Losers</TabsTrigger>
                  <TabsTrigger value="active">Most Active</TabsTrigger>
                </TabsList>
                
                {["gainers", "losers", "mostActive"].map(tab => (
                  <TabsContent key={tab} value={tab} className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {loadingMovers ? (
                         Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                      ) : (
                        movers?.[tab as keyof typeof movers]?.map(quote => (
                          <Link key={quote.symbol} href={`/markets/${quote.symbol}`}>
                            <div className="p-3 border rounded-lg hover:border-primary transition-colors bg-muted/20 cursor-pointer">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold">{quote.symbol}</span>
                                <span className="font-medium">{formatCurrency(quote.price)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground truncate w-24">{quote.name}</span>
                                <span className={quote.change >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                                  {formatChange(quote.changePercent, true)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Symbols</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search symbols or names..." 
                    className="pl-9 bg-muted/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingQuotes ? (
                       Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                       ))
                    ) : filteredQuotes?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No symbols found matching "{search}"
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuotes?.map((quote) => (
                        <TableRow key={quote.symbol} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/markets/${quote.symbol}`}>
                          <TableCell className="font-bold text-primary">{quote.symbol}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">{quote.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-xs">{quote.sector}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(quote.price)}</TableCell>
                          <TableCell className={`text-right font-medium ${quote.change >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatChange(quote.change)} <span className="text-xs opacity-80">({formatChange(quote.changePercent, true)})</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full border-muted">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg">Breaking News</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {loadingNews ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                ) : (
                  news?.map(item => (
                    <a key={item.id} href="#" className="block p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="font-bold text-foreground/80">{item.source}</span>
                        <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-medium leading-snug group-hover:text-primary transition-colors mb-2">
                        {item.headline}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.summary}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.symbols.map(sym => (
                          <Badge key={sym} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {sym}
                          </Badge>
                        ))}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
