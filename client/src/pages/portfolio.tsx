import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

type ApiMeResponse = {
  user: { id: string; email: string; username?: string | null; credits: number };
};
type ApiTradesResponse = { trades: ApiTrade[] };
type ApiMarketsResponse = { markets: ApiMarket[] };

type ApiTrade = {
  id: string;
  market_id: string;
  side: "YES" | "NO";
  amount: number;
  created_at: string;
};

type ApiMarket = {
  id: string;
  question: string;
  status: string | null;
  created_at: string | null;
  volume: number;
};

type Position = {
  id: string; // `${market_id}:${side}`
  marketTitle: string;
  side: "YES" | "NO";
  amount: number; // total staked on this side
};

export default function PortfolioPage() {
  const [, setLocation] = useLocation();

  const meQuery = useQuery<ApiMeResponse>({
    queryKey: ["/me"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const tradesQuery = useQuery<ApiTradesResponse>({
    queryKey: ["/trades"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const marketsQuery = useQuery<ApiMarketsResponse>({
    queryKey: ["/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const credits = Number(meQuery.data?.user?.credits ?? 0);
  const trades = tradesQuery.data?.trades ?? [];
  const markets = marketsQuery.data?.markets ?? [];

  const marketTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mk of markets) {
      m.set(mk.id, mk.question || mk.id);
    }
    return m;
  }, [markets]);

  // Active stake = total tokens spent in trades
  const activeStake = useMemo(() => {
    return trades.reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
  }, [trades]);

  // Positions = aggregate by (market_id, side)
  const positions: Position[] = useMemo(() => {
    const agg = new Map<string, Position>();

    for (const t of trades) {
      const key = `${t.market_id}:${t.side}`;
      const title = marketTitleById.get(t.market_id) ?? t.market_id;

      const existing = agg.get(key);
      if (existing) {
        existing.amount += Number(t.amount ?? 0);
      } else {
        agg.set(key, {
          id: key,
          marketTitle: title,
          side: t.side,
          amount: Number(t.amount ?? 0),
        });
      }
    }

    // Most-staked first
    return Array.from(agg.values()).sort((a, b) => b.amount - a.amount);
  }, [trades, marketTitleById]);

  // Pretty timestamp helper
  function formatTime(ts: string) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString();
  }

  // If unauthorized, send to /auth
  if (meQuery.isError) {
    setTimeout(() => setLocation("/auth"), 0);
  }

  return (
    <div className="min-h-screen bg-background berkeley-gradient">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent text-accent-foreground rounded flex items-center justify-center font-black">
              C
            </div>
            <span className="font-black uppercase tracking-tighter">
              Portfolio
            </span>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="frost noise p-6 border-accent/20">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Available Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {meQuery.isLoading ? "—" : credits.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-accent">TOKENS</span>
              </div>
            </div>
          </Card>

          <Card className="frost noise p-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Active Stake
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {tradesQuery.isLoading ? "—" : activeStake.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  TOKENS
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
            <TabsTrigger value="holdings" className="rounded-lg px-8 flex gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Holdings
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-8 flex gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4">
            {tradesQuery.isLoading || marketsQuery.isLoading ? (
              <Card className="frost noise p-6">Loading holdings…</Card>
            ) : positions.length === 0 ? (
              <Card className="frost noise p-6">
                No holdings yet. Place a trade to get started.
              </Card>
            ) : (
              positions.map((pos) => (
                <Card
                  key={pos.id}
                  className="frost noise p-6 group hover:border-accent/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                        {pos.marketTitle}
                      </h3>
                      <div className="flex gap-2 items-center">
                        <Badge
                          variant="outline"
                          className={
                            pos.side === "YES"
                              ? "border-primary text-primary-foreground bg-primary/20"
                              : "border-destructive text-destructive"
                          }
                        >
                          {pos.side}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          Total staked: {pos.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                      <div className="text-right">
                        <p className="text-xs font-mono text-muted-foreground uppercase">
                          Stake
                        </p>
                        <p className="font-bold">
                          {pos.amount.toLocaleString()} tokens
                        </p>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="hidden md:flex"
                        disabled
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card className="frost noise overflow-hidden">
              <div className="divide-y divide-border">
                {tradesQuery.isLoading || marketsQuery.isLoading ? (
                  <div className="p-4">Loading history…</div>
                ) : trades.length === 0 ? (
                  <div className="p-4">No trades yet.</div>
                ) : (
                  trades.map((tx) => {
                    const title = marketTitleById.get(tx.market_id) ?? tx.market_id;
                    const amount = Number(tx.amount ?? 0);
                    const isDebit = amount > 0; // trading spends tokens
                    return (
                      <div
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              isDebit
                                ? "bg-red-400/10 text-red-400"
                                : "bg-green-400/10 text-green-400"
                            }`}
                          >
                            {isDebit ? (
                              <ArrowUpRight className="h-5 w-5" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold">
                              Bought {tx.side} • {title}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />{" "}
                              {formatTime(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            isDebit ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          {isDebit ? "-" : "+"}
                          {amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}