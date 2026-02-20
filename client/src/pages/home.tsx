import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Trophy,
  TrendingUp,
  Search,
  Info,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

/** UI types */
type MarketType = "yesno";
type Market = {
  id: string;
  title: string;
  category: "Campus" | "Weather" | "Dining" | "Chaos";
  type: MarketType;
  endsAt: string;
  volume: number;
  yesPrice: number; // 0..1
  detailedRules: string;
};

type ApiMarketRow = {
  id: string;
  question: string;
  status: string | null;
  created_at: string | null;
  volume?: number;
};

type ApiMarketsResponse = { markets: ApiMarketRow[] };

type ApiStatsResponse = {
  activeTokensStaked: number;
  dailyForecasters: number;
};

type ApiMeResponse =
  | { user: { id: string; email: string; username?: string | null; credits: number } }
  | null;

type ApiLeaderboardResponse = {
  leaders: { name: string; tokens: number }[];
};

const typewriterWords = [
  "campus events.",
  "RSF capacity.",
  "weather shifts.",
  "YikYak trends.",
  "Sproul protests.",
];

function TypewriterEffect() {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = typewriterWords[index];
    const speed = isDeleting ? 50 : 100;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentWord.substring(0, displayText.length + 1));
        if (displayText.length === currentWord.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setDisplayText(currentWord.substring(0, displayText.length - 1));
        if (displayText.length === 1) {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % typewriterWords.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index]);

  return <span className="text-primary">{displayText}</span>;
}

function adaptApiMarket(m: ApiMarketRow): Market {
  const q = String(m.question ?? "");
  const lowered = q.toLowerCase();

  let category: Market["category"] = "Campus";
  if (lowered.includes("rain") || lowered.includes("weather") || lowered.includes("temperature")) category = "Weather";
  else if (lowered.includes("cafe") || lowered.includes("dining") || lowered.includes("menu") || lowered.includes("boba"))
    category = "Dining";
  else if (lowered.includes("yik") || lowered.includes("anthem") || lowered.includes("sproul") || lowered.includes("protest"))
    category = "Chaos";

  const endsAt = "Today";
  const yesPrice = 0.5;
  const detailedRules = "Resolution details are not yet configured for this market. Check back soon.";

  return {
    id: m.id,
    title: q || "Untitled market",
    category,
    type: "yesno",
    endsAt,
    volume: Number((m as any).volume ?? 0),
    yesPrice,
    detailedRules,
  };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showRules, setShowRules] = useState(false);

  // Auth/session user
  const meQuery = useQuery<ApiMeResponse>({
    queryKey: ["/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const signedIn = !!(meQuery.data as any)?.user;
  const tokens = Number((meQuery.data as any)?.user?.credits ?? 0);

  // Markets
  const marketsQuery = useQuery<ApiMarketsResponse>({
    queryKey: ["/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const markets: Market[] = useMemo(() => {
    const rows = marketsQuery.data?.markets ?? [];
    return rows.map(adaptApiMarket);
  }, [marketsQuery.data]);

  // Stats
  const statsQuery = useQuery<ApiStatsResponse>({
    queryKey: ["/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
  });

  const activeTokensStaked = Number((statsQuery.data as any)?.activeTokensStaked ?? 0);
  const dailyForecasters = Number((statsQuery.data as any)?.dailyForecasters ?? 0);

  // Leaderboard (REAL)
  const leaderboardQuery = useQuery<ApiLeaderboardResponse>({
    queryKey: ["/leaderboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
  });

  const leaders = (leaderboardQuery.data as any)?.leaders ?? [];

  const filteredMarkets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter((m) => m.title.toLowerCase().includes(q));
  }, [search, markets]);

  // Place trade
  const tradeMutation = useMutation({
    mutationFn: async (input: { marketId: string; side: "YES" | "NO"; amount: number }) => {
      const res = await apiRequest("POST", "/trades", input);
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/markets"] });
      await queryClient.invalidateQueries({ queryKey: ["/stats"] });
      await queryClient.invalidateQueries({ queryKey: ["/leaderboard"] });
    },
  });

  async function handleTrade(marketId: string, side: "YES" | "NO") {
    if (!signedIn) {
      setLocation("/auth");
      return;
    }

    try {
      const amount = 50;
      await tradeMutation.mutateAsync({ marketId, side, amount });
      toast({ title: "Trade placed", description: `Bought ${side} (${amount} tokens)` });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Could not place trade.";
      toast({ title: "Trade failed", description: msg, variant: "destructive" });
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("POST", "/auth/logout", {});
    } catch {
      // even if backend fails, we still clear local auth
    } finally {
      window.localStorage.removeItem("calshi_session_token");
      await queryClient.invalidateQueries({ queryKey: ["/me"] });
      toast({ title: "Logged out" });
      setLocation("/auth");
    }
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
              <img src="/static/logo.png" alt="Calshi" className="h-12 w-auto brightness-110" />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {signedIn ? (
              <>
                <Link href="/portfolio">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-all cursor-pointer border border-border">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{tokens.toLocaleString()}</span>
                  </div>
                </Link>

                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setLocation("/auth")}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-full"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16">
        <section className="mb-20 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black mb-6 tracking-widest border border-primary/20"
            >
              <Trophy className="h-3.5 w-3.5" /> $250 WEEKLY GIFT CARD PRIZE
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 leading-[1.1]">
              Predict the future of <br />
              <TypewriterEffect />
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Join the official Berkeley forecasting tournament. Start with 1,000 tokens.
              <span className="block font-bold text-foreground mt-3">Verified .edu only. No purchase necessary.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search live markets..."
                  className="pl-12 h-14 bg-secondary/50 border-border focus-visible:ring-primary rounded-2xl text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="h-14 px-8 gap-2 rounded-2xl border-border hover:bg-secondary font-bold"
                onClick={() => setShowRules(true)}
              >
                <Info className="h-5 w-5" /> Tournament Rules
              </Button>
            </div>

            {!signedIn && (
              <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-4 w-4" />
                Sign in to trade and see your token balance.
              </div>
            )}
          </div>

          <div className="w-full max-w-xl space-y-6">
            <div className="rounded-3xl border border-primary/20 bg-secondary/20 p-8 backdrop-blur">
              <div className="text-xs font-black tracking-widest text-primary mb-4">MARKET STATS</div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-4xl font-black">{activeTokensStaked.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground font-bold mt-1">ACTIVE TOKENS STAKED</div>
                </div>
                <div>
                  <div className="text-4xl font-black">{dailyForecasters.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground font-bold mt-1">DAILY FORECASTERS</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-secondary/20 p-8 backdrop-blur">
              <div className="text-xs font-black tracking-widest text-foreground mb-4">TOP BEARS</div>
              <div className="space-y-3">
                {leaders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No leaderboard data yet.</div>
                ) : (
                  leaders.slice(0, 4).map((u: any, idx: number) => (
                    <div key={u.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground font-black w-6">#{idx + 1}</div>
                        <div className="font-bold">{u.name}</div>
                      </div>
                      <div className="font-black text-primary">{Number(u.tokens).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMarkets.map((m) => (
              <div key={m.id} className="rounded-3xl border border-border bg-secondary/20 p-6 backdrop-blur">
                <div className="text-xs font-black tracking-widest text-primary mb-2">{m.category.toUpperCase()}</div>
                <div className="text-xl font-black mb-6">{m.title}</div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="h-12 rounded-2xl font-black"
                    onClick={() => handleTrade(m.id, "YES")}
                    disabled={tradeMutation.isPending}
                  >
                    YES 50¢
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl font-black"
                    onClick={() => handleTrade(m.id, "NO")}
                    disabled={tradeMutation.isPending}
                  >
                    NO 50¢
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-bold">
                  <div>{m.volume.toLocaleString()} TOKENS TRADED</div>
                  <div>{m.endsAt}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {showRules && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="max-w-2xl w-full rounded-3xl border border-border bg-background p-8">
              <div className="text-2xl font-black mb-4">Tournament Rules</div>
              <div className="text-sm text-muted-foreground space-y-3">
                <p>1) Berkeley email required.</p>
                <p>2) Start with 1,000 tokens.</p>
                <p>3) Tokens have no cash value.</p>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowRules(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}