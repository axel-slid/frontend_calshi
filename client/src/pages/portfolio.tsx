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

type ApiMeResponse = { user: { id: string; email: string; username?: string | null; credits: number } };
type ApiTradesResponse = { trades: ApiTrade[] };
type ApiMarketsResponse = { markets: ApiMarket[] };
type ApiLedgerResponse = { ledger: ApiLedgerRow[] };

type ApiTrade = {
  id: string;
  market_id: string;
  side: "YES" | "NO";
  amount: number; // stake
  price?: number | null; // execution price at trade time (recommended)
  shares?: number | null; // amount/price (recommended)
  created_at: string;
};

type ApiMarket = {
  id: string;
  question: string;
  status: string | null; // 'open' | 'closed' | 'resolved'
  resolution?: "yes" | "no" | null;
  created_at: string | null;
  volume?: number;
  yes_price?: number | null;
  no_price?: number | null;
};

type ApiLedgerRow = {
  id: string;
  user_id: string;
  market_id: string | null;
  entry_type: string | null; // 'welcome_grant' | 'trade_debit' | 'payout' | ...
  type: string; // legacy field; can be same as entry_type
  amount: number; // positive/negative
  created_at: string;
};

type Position = {
  id: string; // `${market_id}:${side}`
  marketId: string;
  marketTitle: string;
  marketStatus: string;
  resolution: "yes" | "no" | null;
  side: "YES" | "NO";
  stake: number; // sum trade.amount
  shares: number | null; // sum trade.shares (null if not available)
  currentPrice: number | null; // from markets yes/no price
  currentValue: number | null; // shares * currentPrice
  unrealizedPnL: number | null; // currentValue - stake
  realizedPnL: number | null; // payout - stake if resolved (computed via ledger)
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function fmt(n: number) {
  return Math.floor(n).toLocaleString();
}

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

  // ✅ NEW: ledger query (P/L source of truth)
  const ledgerQuery = useQuery<ApiLedgerResponse>({
    queryKey: ["/ledger"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const credits = Number(meQuery.data?.user?.credits ?? 0);
  const trades = tradesQuery.data?.trades ?? [];
  const markets = marketsQuery.data?.markets ?? [];
  const ledger = ledgerQuery.data?.ledger ?? [];

  // If unauthorized, send to /auth
  if (meQuery.isError || tradesQuery.isError || marketsQuery.isError || ledgerQuery.isError) {
    setTimeout(() => setLocation("/auth"), 0);
  }

  const marketById = useMemo(() => {
    const m = new Map<string, ApiMarket>();
    for (const mk of markets) m.set(mk.id, mk);
    return m;
  }, [markets]);

  const marketTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mk of markets) m.set(mk.id, mk.question || mk.id);
    return m;
  }, [markets]);

  // ------------------------------------------------------------
  // Ledger-derived P/L
  // ------------------------------------------------------------
  // Total P/L vs starting grant: sum(all ledger except welcome_grant)
  const totalPnL = useMemo(() => {
    return ledger.reduce((acc, row) => {
      const et = (row.entry_type ?? row.type ?? "").toLowerCase();
      if (et === "welcome_grant") return acc;
      return acc + Number(row.amount ?? 0);
    }, 0);
  }, [ledger]);

  // Active stake (open positions) from trades:
  // If you want true "active" stake, filter to open markets.
  const activeStake = useMemo(() => {
    return trades.reduce((acc, t) => {
      const mk = marketById.get(t.market_id);
      const status = (mk?.status ?? "open").toLowerCase();
      if (status === "open") return acc + Number(t.amount ?? 0);
      return acc;
    }, 0);
  }, [trades, marketById]);

  // Build helper: realized payout per (market_id, side) from ledger payouts
  // Your payout rows are by market+user; side isn't stored in ledger.
  // So for realized P/L per position, we compute:
  //   realizedPnL(market, side) = (payout for that market) - (stake for that market+side)
  // BUT payout is only paid to the winning side, so attribution to side works:
  // if market resolved yes => only YES side positions get payout; NO side gets 0.
  const payoutByMarket = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of ledger) {
      const et = (row.entry_type ?? row.type ?? "").toLowerCase();
      if (et !== "payout") continue;
      if (!row.market_id) continue;
      map.set(row.market_id, (map.get(row.market_id) ?? 0) + Number(row.amount ?? 0));
    }
    return map;
  }, [ledger]);

  // ------------------------------------------------------------
  // Positions: aggregate trades by (market_id, side)
  // Adds: shares, current value, unrealized, realized (if resolved)
  // ------------------------------------------------------------
  const positions: Position[] = useMemo(() => {
    const agg = new Map<string, Position>();

    for (const t of trades) {
      const mk = marketById.get(t.market_id);
      const title = marketTitleById.get(t.market_id) ?? t.market_id;

      const status = (mk?.status ?? "open").toLowerCase();
      const resolution = (mk?.resolution ?? null) as any;

      const key = `${t.market_id}:${t.side}`;
      const existing = agg.get(key);

      const stake = Number(t.amount ?? 0);
      const shares = t.shares == null ? null : Number(t.shares);

      // current price from market table
      const yesP = mk?.yes_price == null ? null : clamp01(Number(mk.yes_price));
      const noP = mk?.no_price == null ? null : clamp01(Number(mk.no_price));
      const currentPrice = t.side === "YES" ? yesP : noP;

      if (existing) {
        existing.stake += stake;
        if (existing.shares != null && shares != null) existing.shares += shares;
        else if (existing.shares == null && shares != null) existing.shares = shares;
      } else {
        agg.set(key, {
          id: key,
          marketId: t.market_id,
          marketTitle: title,
          marketStatus: status,
          resolution: resolution ?? null,
          side: t.side,
          stake,
          shares,
          currentPrice,
          currentValue: null,
          unrealizedPnL: null,
          realizedPnL: null,
        });
      }
    }

    // finalize values
    for (const pos of agg.values()) {
      // refresh current price (in case market loaded after)
      const mk = marketById.get(pos.marketId);
      const yesP = mk?.yes_price == null ? null : clamp01(Number(mk.yes_price));
      const noP = mk?.no_price == null ? null : clamp01(Number(mk.no_price));
      pos.currentPrice = pos.side === "YES" ? yesP : noP;

      // Unrealized requires shares + current price (mark-to-market)
      if (pos.marketStatus === "open" && pos.shares != null && pos.currentPrice != null) {
        pos.currentValue = pos.shares * pos.currentPrice;
        pos.unrealizedPnL = pos.currentValue - pos.stake;
      } else {
        pos.currentValue = null;
        pos.unrealizedPnL = null;
      }

      // Realized P/L if resolved/closed with resolution:
      // payout is only for winning side; losing side payout=0
      if ((pos.marketStatus === "resolved" || pos.marketStatus === "closed") && pos.resolution) {
        const winnerSide: "YES" | "NO" = pos.resolution === "yes" ? "YES" : "NO";
        const payout = pos.side === winnerSide ? (payoutByMarket.get(pos.marketId) ?? 0) : 0;
        pos.realizedPnL = payout - pos.stake;
      }
    }

    // sort: open first, then most staked
    return Array.from(agg.values()).sort((a, b) => {
      const ao = a.marketStatus === "open" ? 0 : 1;
      const bo = b.marketStatus === "open" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return b.stake - a.stake;
    });
  }, [trades, marketById, marketTitleById, payoutByMarket]);

  // ------------------------------------------------------------
  // Ledger-based history (better than trades-only)
  // ------------------------------------------------------------
  const historyRows = useMemo(() => {
    // newest first
    return [...ledger].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [ledger]);

  return (
    <div className="min-h-screen bg-background berkeley-gradient">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent text-accent-foreground rounded flex items-center justify-center font-black">
              C
            </div>
            <span className="font-black uppercase tracking-tighter">Portfolio</span>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="frost noise p-6 border-accent/20">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Available Balance</span>
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
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Active Stake</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {tradesQuery.isLoading || marketsQuery.isLoading ? "—" : activeStake.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-muted-foreground">TOKENS</span>
              </div>
            </div>
          </Card>

          <Card className="frost noise p-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Total P/L</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalPnL >= 0 ? "+" : ""}
                  {fmt(totalPnL)}
                </span>
                <span className="text-xs font-mono text-muted-foreground">TOKENS</span>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                From ledger (excludes welcome grant)
              </p>
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
              <Card className="frost noise p-6">No holdings yet. Place a trade to get started.</Card>
            ) : (
              positions.map((pos) => {
                const isYes = pos.side === "YES";
                const badgeClass = isYes
                  ? "border-primary text-primary-foreground bg-primary/20"
                  : "border-destructive text-destructive";

                const showUnreal = pos.unrealizedPnL != null;
                const showReal = pos.realizedPnL != null;

                const pnl = showReal ? pos.realizedPnL! : showUnreal ? pos.unrealizedPnL! : null;

                const pnlColor =
                  pnl == null ? "text-muted-foreground" : pnl >= 0 ? "text-green-400" : "text-red-400";

                return (
                  <Card key={pos.id} className="frost noise p-6 group hover:border-accent/30 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                          {pos.marketTitle}
                        </h3>

                        <div className="flex gap-2 items-center flex-wrap">
                          <Badge variant="outline" className={badgeClass}>
                            {pos.side}
                          </Badge>

                          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                            {pos.marketStatus}
                          </Badge>

                          {pos.marketStatus !== "open" && pos.resolution ? (
                            <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                              resolved: {pos.resolution.toUpperCase()}
                            </Badge>
                          ) : null}

                          <span className="text-xs font-mono text-muted-foreground">
                            Total staked: {fmt(pos.stake)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                        <div className="text-right">
                          <p className="text-xs font-mono text-muted-foreground uppercase">Stake</p>
                          <p className="font-bold">{fmt(pos.stake)} tokens</p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-mono text-muted-foreground uppercase">
                            {pos.marketStatus === "open" ? "Unrealized P/L" : "Realized P/L"}
                          </p>
                          <p className={`font-black ${pnlColor}`}>
                            {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}${fmt(pnl)}`}
                          </p>
                          {pos.marketStatus === "open" && (pos.shares == null || pos.currentPrice == null) ? (
                            <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">
                              needs trades.shares + market price
                            </p>
                          ) : null}
                        </div>

                        <Button size="icon" variant="ghost" className="hidden md:flex" disabled>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card className="frost noise overflow-hidden">
              <div className="divide-y divide-border">
                {ledgerQuery.isLoading ? (
                  <div className="p-4">Loading history…</div>
                ) : historyRows.length === 0 ? (
                  <div className="p-4">No ledger activity yet.</div>
                ) : (
                  historyRows.map((row) => {
                    const et = (row.entry_type ?? row.type ?? "").toLowerCase();
                    const amount = Number(row.amount ?? 0);

                    const isCredit = amount > 0;
                    const icon = isCredit ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />;

                    const title =
                      et === "welcome_grant"
                        ? "Welcome Grant"
                        : et === "trade_debit"
                          ? "Trade"
                          : et === "payout"
                            ? "Payout"
                            : (row.type || "Ledger").toString();

                    const marketTitle =
                      row.market_id ? (marketTitleById.get(row.market_id) ?? row.market_id) : null;

                    return (
                      <div key={row.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              isCredit ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                            }`}
                          >
                            {icon}
                          </div>

                          <div>
                            <p className="font-bold">
                              {title}
                              {marketTitle ? ` • ${marketTitle}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatTime(row.created_at)}
                            </p>
                          </div>
                        </div>

                        <span className={`font-mono font-bold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                          {isCredit ? "+" : ""}
                          {fmt(amount)}
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