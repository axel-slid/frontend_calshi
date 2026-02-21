import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  Gift,
  Shield,
  Info,
  Clock,
  Trophy,
  Copy,
  ChevronRight,
  TrendingUp,
  Mail,
  ArrowBigUp,
  ArrowBigDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

type MarketType = "yesno" | "overunder";

type Market = {
  id: string;
  title: string;
  category: "Weather" | "Campus" | "Chaos" | "Dining";
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
  volume: number;
};

type ApiMarketsResponse = { markets: ApiMarketRow[] };

type ApiSuggestionRow = {
  id: string;
  title: string;
  details: string;
  created_at: string;
  score: number;
  upvotes: number;
  downvotes: number;
  viewer_vote: number; // 1, -1, or 0
};

type ApiSuggestionsResponse = { suggestions: ApiSuggestionRow[] };

type ApiStatsResponse = {
  activeTokensStaked: number;
  dailyForecasters: number;
};

type ApiMeResponse =
  | { user: { id: string; email: string; username?: string | null; credits: number } }
  | null;

const typewriterWords = ["campus events.", "RSF capacity.", "weather shifts.", "YikYak trends.", "Sproul protests."];

const demoLeaders = [
  { name: "Asha", tokens: 4820 },
  { name: "Miles", tokens: 4310 },
  { name: "Jin", tokens: 3980 },
  { name: "Sofia", tokens: 3520 },
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
        if (displayText.length === 0) {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % typewriterWords.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index]);

  return (
    <span className="text-primary inline-block min-w-[200px] text-left">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function RulesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Tournament Rules</DialogTitle>
          <DialogDescription>Calshi Weekly Forecast Competition</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4" /> $250 Weekly Prize
            </h4>
            <p className="text-sm">
              The top forecaster at the end of each week-long competition wins a $250 Amazon Gift Card.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">
                1
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Daily Prompts:</strong> New markets are added every day throughout the
                week.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tokens:</strong> Start with 1,000 play tokens. No purchase necessary.
                No monetary value.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">
                3
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Verification:</strong> Must sign in with a verified @berkeley.edu email.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionCreateDialog({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (title: string, details: string) => Promise<void> | void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  return (
    <DialogContent className="max-w-xl bg-card border-border">
      <DialogHeader>
        <DialogTitle>New Market Suggestion</DialogTitle>
        <DialogDescription>
          Post an idea for a future market. Your identity is not shown to other users.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <div className="text-sm font-black">Title</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Will the RSF hit capacity before 6pm today?"
            className="rounded-xl"
          />
          <div className="text-xs text-muted-foreground">5–140 characters</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-black">Details (optional)</div>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add context, resolution criteria, links, etc."
            className="rounded-xl min-h-[140px]"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          className="w-full rounded-xl font-black"
          disabled={isSubmitting || title.trim().length < 5 || title.trim().length > 140}
          onClick={async () => {
            await onSubmit(title.trim(), details.trim());
            setTitle("");
            setDetails("");
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Client-side adapter because your Supabase `markets` table (per screenshot) only has:
// id, question, status, created_at. Volume is computed server-side.
function adaptApiMarket(m: ApiMarketRow): Market {
  const q = (m.question ?? "").trim();

  // Heuristics to keep your UI categories/tags alive until you add real columns
  const lowered = q.toLowerCase();
  let category: Market["category"] = "Campus";
  if (lowered.includes("rain") || lowered.includes("weather") || lowered.includes("temperature")) category = "Weather";
  else if (lowered.includes("cafe") || lowered.includes("dining") || lowered.includes("menu") || lowered.includes("boba"))
    category = "Dining";
  else if (lowered.includes("yik") || lowered.includes("anthem") || lowered.includes("sproul") || lowered.includes("protest"))
    category = "Chaos";

  // Basic defaults
  const endsAt = "Today";
  const yesPrice = 0.5; // until you store pricing in DB
  const detailedRules =
    "Resolution details are not yet configured for this market. Check back soon.";

  return {
    id: m.id,
    title: q || "Untitled market",
    category,
    type: "yesno",
    endsAt,
    volume: Number(m.volume ?? 0),
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

  // Markets from backend (Supabase)
  const marketsQuery = useQuery<ApiMarketsResponse>({
    queryKey: ["/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Suggestions
  const suggestionsQuery = useQuery<ApiSuggestionsResponse>({
    queryKey: ["/markets/suggestions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const markets: Market[] = useMemo(() => {
    const rows = marketsQuery.data?.markets ?? [];
    return rows.map(adaptApiMarket);
  }, [marketsQuery.data]);

  // Stats from backend (Supabase)
  const statsQuery = useQuery<ApiStatsResponse>({
    queryKey: ["/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const activeTokensStaked = Number((statsQuery.data as any)?.activeTokensStaked ?? 0);
  const dailyForecasters = Number((statsQuery.data as any)?.dailyForecasters ?? 0);

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
      await queryClient.invalidateQueries({ queryKey: ["/markets"] }); // volume changes
      await queryClient.invalidateQueries({ queryKey: ["/stats"] });
    },
  });

  const createSuggestionMutation = useMutation({
    mutationFn: async (input: { title: string; details?: string }) => {
      const res = await apiRequest("POST", "/markets/suggestions", input);
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/markets/suggestions"] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (input: { suggestionId: string; value: 1 | -1 | 0 }) => {
      const res = await apiRequest("POST", `/markets/suggestions/${input.suggestionId}/vote`, {
        value: input.value,
      });
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/markets/suggestions"] });
    },
  });

  async function handleTrade(marketId: string, side: "YES" | "NO") {
    if (!signedIn) {
      setLocation("/auth");
      return;
    }

    try {
      // minimal fixed bet size for now; you can replace with a modal/input later
      const amount = 50;
      await tradeMutation.mutateAsync({ marketId, side, amount });
      toast({ title: "Trade placed", description: `Bought ${side} (${amount} tokens)` });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Could not place trade.";
      toast({ title: "Trade failed", description: msg, variant: "destructive" });
    }
  }

  async function handleCreateSuggestion(title: string, details: string) {
    if (!signedIn) {
      setLocation("/auth");
      return;
    }
    await createSuggestionMutation.mutateAsync({ title, details });
    toast({ title: "Submitted", description: "Suggestion posted (anonymously)." });
  }

  async function handleVote(suggestion: ApiSuggestionRow, nextValue: 1 | -1) {
    if (!signedIn) {
      setLocation("/auth");
      return;
    }
    const current = Number(suggestion.viewer_vote ?? 0) as 1 | -1 | 0;
    const value: 1 | -1 | 0 = current === nextValue ? 0 : nextValue;
    await voteMutation.mutateAsync({ suggestionId: suggestion.id, value });
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

                {/* You may add a backend logout endpoint later.
                    For now, just show user is signed in. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    toast({
                      title: "Logout not implemented",
                      description: "Add a /auth/logout endpoint on the backend to clear the session.",
                      variant: "destructive",
                    });
                  }}
                >
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

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:block w-full max-w-sm">
            <Card className="p-8 border-primary/20 bg-primary/5 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Shield className="h-8 w-8 text-primary/20" />
              </div>
              <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Market Stats</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-black">
                    {statsQuery.isLoading ? "—" : activeTokensStaked.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Tokens Staked</p>
                </div>
                <div>
                  <p className="text-3xl font-black">
                    {statsQuery.isLoading ? "—" : dailyForecasters.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily Forecasters</p>
                </div>
                <div className="pt-4 border-t border-primary/10">
                  <p className="text-sm font-bold text-primary">New prompts in 4h 12m</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-8">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-transparent h-auto p-0 gap-8 border-b border-border rounded-none w-full justify-start overflow-x-auto scrollbar-hide">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all"
                >
                  All Markets
                </TabsTrigger>
                <TabsTrigger
                  value="weather"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all"
                >
                  Weather
                </TabsTrigger>
                <TabsTrigger
                  value="campus"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all"
                >
                  Campus
                </TabsTrigger>
                <TabsTrigger
                  value="suggestions"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all"
                >
                  Suggestions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {marketsQuery.isLoading ? (
                  <Card className="p-6">Loading markets…</Card>
                ) : marketsQuery.isError ? (
                  <Card className="p-6">
                    Could not load markets.{" "}
                    <span className="text-muted-foreground text-sm">
                      {(marketsQuery.error as any)?.message ?? ""}
                    </span>
                  </Card>
                ) : filteredMarkets.length === 0 ? (
                  <Card className="p-6">No markets match your search.</Card>
                ) : (
                  filteredMarkets.map((market) => (
                    <Card key={market.id} className="market-card p-6 group flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <Badge
                            variant="secondary"
                            className="bg-secondary text-primary hover:bg-secondary border-none rounded-full px-3 py-1 text-[10px] uppercase font-black tracking-widest"
                          >
                            {market.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> {market.endsAt}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-foreground leading-snug mb-6 group-hover:text-primary transition-colors line-clamp-2 h-14">
                          {market.title}
                        </h3>
                      </div>

                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <Button
                            className="bg-primary hover:bg-primary/90 text-white font-black py-7 rounded-2xl text-lg shadow-lg shadow-primary/20"
                            disabled={tradeMutation.isPending}
                            onClick={() => handleTrade(market.id, "YES")}
                          >
                            YES {Math.round(market.yesPrice * 100)}¢
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border hover:bg-secondary text-foreground font-black py-7 rounded-2xl text-lg"
                            disabled={tradeMutation.isPending}
                            onClick={() => handleTrade(market.id, "NO")}
                          >
                            NO {Math.round((1 - market.yesPrice) * 100)}¢
                          </Button>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border/50">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">
                            {market.volume.toLocaleString()} TOKENS TRADED
                          </span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-[10px] font-black text-primary flex items-center gap-1 hover:no-underline hover:opacity-80"
                              >
                                RULES <ChevronRight className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border">
                              <DialogHeader>
                                <DialogTitle>Resolution Details</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 text-sm text-muted-foreground leading-relaxed">
                                {market.detailedRules}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="suggestions" className="pt-8 space-y-6">
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black">Suggest a Market</h3>
                      <p className="text-sm text-muted-foreground">
                        Suggestions are shown without your identity. Votes help decide what markets to create.
                      </p>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="rounded-xl font-black">New Suggestion</Button>
                      </DialogTrigger>
                      <SuggestionCreateDialog
                        onSubmit={handleCreateSuggestion}
                        isSubmitting={createSuggestionMutation.isPending}
                      />
                    </Dialog>
                  </div>
                </Card>

                {suggestionsQuery.isLoading ? (
                  <Card className="p-6">Loading suggestions…</Card>
                ) : suggestionsQuery.isError ? (
                  <Card className="p-6">
                    Could not load suggestions.{" "}
                    <span className="text-muted-foreground text-sm">
                      {(suggestionsQuery.error as any)?.message ?? ""}
                    </span>
                  </Card>
                ) : (suggestionsQuery.data?.suggestions ?? []).length === 0 ? (
                  <Card className="p-6">No suggestions yet. Be the first.</Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(suggestionsQuery.data?.suggestions ?? []).map((s) => {
                      const upActive = Number(s.viewer_vote ?? 0) === 1;
                      const downActive = Number(s.viewer_vote ?? 0) === -1;

                      return (
                        <Card key={s.id} className="p-6">
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <Button
                                variant={upActive ? "default" : "outline"}
                                size="icon"
                                className="rounded-xl"
                                disabled={voteMutation.isPending}
                                onClick={() => handleVote(s, 1)}
                                aria-label="Upvote"
                              >
                                <ArrowBigUp className="h-5 w-5" />
                              </Button>
                              <div className="font-black text-lg">{Number(s.score ?? 0)}</div>
                              <Button
                                variant={downActive ? "default" : "outline"}
                                size="icon"
                                className="rounded-xl"
                                disabled={voteMutation.isPending}
                                onClick={() => handleVote(s, -1)}
                                aria-label="Downvote"
                              >
                                <ArrowBigDown className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="font-black text-base leading-snug break-words">{s.title}</h4>
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest shrink-0">
                                  {new Date(s.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {s.details ? (
                                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                                  {s.details}
                                </p>
                              ) : null}

                              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-black">{Number(s.upvotes ?? 0)} up</span>
                                <span className="font-black">{Number(s.downvotes ?? 0)} down</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* If you want per-tab filtering later, we can add it. */}
            </Tabs>
          </div>

          <aside className="space-y-8">
            <Card className="p-8 bg-primary text-white border-none rounded-[2rem] overflow-hidden relative group">
              <div className="relative z-10">
                <h4 className="font-black text-2xl mb-3">Invite Peers</h4>
                <p className="text-white/80 text-sm mb-6 font-medium">
                  Earn <span className="text-white font-black">100 tokens</span> for every Bear you bring to the platform.
                </p>
                <div className="flex gap-2">
                  <Input
                    value="CALSHI2026"
                    readOnly
                    className="bg-white/20 border-white/10 text-white font-mono text-sm h-11 focus-visible:ring-0"
                  />
                  <Button
                    size="icon"
                    className="bg-white text-primary hover:bg-white/90 shrink-0 h-11 w-11 rounded-xl"
                    onClick={() => {
                      navigator.clipboard.writeText("CALSHI2026").catch(() => {});
                      toast({ title: "Copied", description: "Invite code copied to clipboard." });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="absolute -bottom-12 -right-12 h-40 w-40 bg-white/20 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-700" />
            </Card>

            <Card className="p-8 border-border rounded-[2rem] bg-secondary/30">
              <h4 className="font-black flex items-center gap-2 mb-6 uppercase tracking-widest text-sm text-foreground">
                <Trophy className="h-4 w-4 text-primary" /> Top Bears
              </h4>
              <div className="space-y-6">
                {demoLeaders.map((leader, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-muted-foreground w-4">#{i + 1}</span>
                      <span className="font-bold text-sm">{leader.name}</span>
                    </div>
                    <span className="font-mono text-xs font-black text-primary">{leader.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-8 text-xs font-black uppercase tracking-[0.2em] h-10 hover:bg-primary/10 hover:text-primary rounded-xl"
              >
                Full Leaderboard
              </Button>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="border-t bg-background/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <img src="/static/logo.png" alt="Calshi" className="h-10 w-auto opacity-80 brightness-110" />
            <div className="flex flex-col items-center md:items-end gap-4">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Verified Berkeley .edu only</p>
              <div className="flex gap-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
          <p className="mt-12 pt-8 border-t border-border/50 text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.4em]">
            © 2026 CALSHI PREDICTION MARKETS • NO PURCHASE NECESSARY • PLAY TOKENS ONLY
          </p>
        </div>
      </footer>

      <RulesModal open={showRules} onOpenChange={setShowRules} />
    </div>
  );
}