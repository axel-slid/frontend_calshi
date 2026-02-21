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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  noPrice: number; // 0..1
  detailedRules: string;
};

type ApiMarketRow = {
  id: string;
  question: string;
  status: string | null;
  created_at: string | null;

  volume?: number | string | null;

  yes_price?: number | string | null;
  no_price?: number | string | null;
  rules?: string | null;
  ends_at?: string | null;
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

type ApiInviteCodeResponse = { code: string } | null;

const typewriterWords = [
  "campus events.",
  "RSF capacity.",
  "weather shifts.",
  "YikYak trends.",
  "Sproul protests.",
];

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

function RulesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
                <strong className="text-foreground">Weekly Drop:</strong> New prompts are released every Sunday at 12:00 PM PST.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tokens:</strong> Start with 1,000 play tokens. No purchase necessary. No monetary value.
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
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">
                4
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Contest End:</strong> Weekly contest ends Friday at 5:00 PM PST.
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

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function formatEndsAt(endsAtIso: string | null | undefined) {
  if (!endsAtIso) return "TBD";
  const d = new Date(endsAtIso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function adaptApiMarket(m: ApiMarketRow): Market {
  const q = (m.question ?? "").trim();

  const lowered = q.toLowerCase();
  let category: Market["category"] = "Campus";
  if (lowered.includes("rain") || lowered.includes("weather") || lowered.includes("temperature")) category = "Weather";
  else if (lowered.includes("cafe") || lowered.includes("dining") || lowered.includes("menu") || lowered.includes("boba"))
    category = "Dining";
  else if (lowered.includes("yik") || lowered.includes("anthem") || lowered.includes("sproul") || lowered.includes("protest"))
    category = "Chaos";

  const yesRaw = m.yes_price;
  const noRaw = m.no_price;

  const yesPrice = clamp01(typeof yesRaw === "number" ? yesRaw : yesRaw != null ? Number(yesRaw) : 0.5);
  const noPrice = clamp01(typeof noRaw === "number" ? noRaw : noRaw != null ? Number(noRaw) : 1 - yesPrice);

  const endsAt = formatEndsAt(m.ends_at);

  const detailedRules =
    (m.rules ?? "").trim() || "Resolution details are not yet configured for this market. Check back soon.";

  return {
    id: m.id,
    title: q || "Untitled market",
    category,
    type: "yesno",
    endsAt,
    volume: Number(m.volume ?? 0),
    yesPrice,
    noPrice,
    detailedRules,
  };
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function calcPayout(stake: number, price: number) {
  const p = Number(price);
  const s = Number(stake);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(s) || s <= 0) return null;
  return s / p;
}

function formatInt(n: number) {
  return Math.max(0, Math.floor(n)).toLocaleString();
}

function TradeButton({
  label,
  price,
  stake,
  variant,
  disabled,
  onClick,
}: {
  label: "YES" | "NO";
  price: number;
  stake: number;
  variant: "yes" | "no";
  disabled?: boolean;
  onClick: () => void;
}) {
  const pct = Math.round(clamp01(price) * 100);
  const payout = calcPayout(stake, price);
  const profit = payout == null ? null : payout - stake;

  const primaryClasses =
    variant === "yes"
      ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
      : "border-border hover:bg-secondary text-foreground";

  return (
    <Button
      className={`py-7 rounded-2xl text-lg font-black ${primaryClasses}`}
      variant={variant === "yes" ? undefined : "outline"}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex flex-col items-center leading-none">
        <div className="flex items-baseline gap-2">
          <span className="text-lg">{label}</span>
          <span className={variant === "yes" ? "text-white/80 text-sm font-extrabold" : "text-muted-foreground text-sm font-extrabold"}>
            {pct}%
          </span>
        </div>

        <div className={variant === "yes" ? "mt-2 text-[11px] font-extrabold text-white/85" : "mt-2 text-[11px] font-extrabold text-muted-foreground"}>
          {payout == null ? (
            <>Stake → Payout —</>
          ) : (
            <>
              Stake {formatInt(stake)} → Payout {formatInt(payout)}
              {profit != null && profit > 0 ? (
                <span className={variant === "yes" ? "ml-2 text-white" : "ml-2 text-foreground"}>
                  (+{formatInt(profit)})
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Button>
  );
}

function getNextFriday5pmPstUtcMs(now: Date) {
  const tz = "America/Los_Angeles";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekday = String(get("weekday"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const pstDow = wdMap[weekday] ?? 0;

  let daysUntilFri = (5 - pstDow + 7) % 7;
  if (pstDow === 5 && (hour > 17 || (hour === 17 && minute >= 0))) {
    daysUntilFri = 7;
  }

  const basePstDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const targetPstMidday = new Date(basePstDate.getTime() + daysUntilFri * 24 * 60 * 60 * 1000);

  const targetParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(targetPstMidday);

  const ty = Number(targetParts.find((p) => p.type === "year")?.value);
  const tm = Number(targetParts.find((p) => p.type === "month")?.value);
  const td = Number(targetParts.find((p) => p.type === "day")?.value);

  const approxUtc = new Date(Date.UTC(ty, tm - 1, td, 17, 0, 0));

  const clockParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(approxUtc);

  const pstH = Number(clockParts.find((p) => p.type === "hour")?.value);
  const pstM = Number(clockParts.find((p) => p.type === "minute")?.value);

  const diffMinutes = (17 - pstH) * 60 + (0 - pstM);
  const correctedUtc = new Date(approxUtc.getTime() + diffMinutes * 60 * 1000);
  return correctedUtc.getTime();
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const dd = Math.floor(total / 86400);
  const hh = Math.floor((total % 86400) / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (dd > 0) return `${dd}d ${pad(hh)}h ${pad(mm)}m ${pad(ss)}s`;
  return `${pad(hh)}h ${pad(mm)}m ${pad(ss)}s`;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const [stake, setStake] = useState(50);

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const contestEndUtcMs = useMemo(() => getNextFriday5pmPstUtcMs(now), [now]);
  const contestCountdown = formatCountdown(contestEndUtcMs - now.getTime());

  const contestEndLabel = useMemo(() => {
    return new Date(contestEndUtcMs).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [contestEndUtcMs]);

  const meQuery = useQuery<ApiMeResponse>({
    queryKey: ["/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const signedIn = !!(meQuery.data as any)?.user;
  const tokens = Number((meQuery.data as any)?.user?.credits ?? 0);

  useEffect(() => {
    if (!signedIn) return;
    const max = Math.max(1, Math.floor(tokens));
    setStake((prev) => clampInt(prev, 1, max));
  }, [signedIn, tokens]);

  const username =
    ((meQuery.data as any)?.user?.username ?? "").toString().trim() ||
    ((meQuery.data as any)?.user?.email ?? "").toString().split("@")[0] ||
    "User";

  const inviteQuery = useQuery<ApiInviteCodeResponse>({
    queryKey: ["/referrals/code"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: signedIn,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const inviteCode = ((inviteQuery.data as any)?.code ?? "").toString();

  const marketsQuery = useQuery<ApiMarketsResponse>({
    queryKey: ["/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
  });

  const markets: Market[] = useMemo(() => {
    const rows = marketsQuery.data?.markets ?? [];
    return rows.map(adaptApiMarket);
  }, [marketsQuery.data]);

  const filteredMarkets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter((m) => m.title.toLowerCase().includes(q));
  }, [search, markets]);

  const statsQuery = useQuery<ApiStatsResponse>({
    queryKey: ["/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
  });

  const activeTokensStaked = Number((statsQuery.data as any)?.activeTokensStaked ?? 0);
  const dailyForecasters = Number((statsQuery.data as any)?.dailyForecasters ?? 0);

  const leaderboardQuery = useQuery<ApiLeaderboardResponse>({
    queryKey: ["/leaderboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
    retry: 1,
  });

  const leaders = useMemo(() => {
    const apiLeaders = (leaderboardQuery.data as any)?.leaders;
    if (Array.isArray(apiLeaders) && apiLeaders.length > 0) return apiLeaders;
    return demoLeaders;
  }, [leaderboardQuery.data]);

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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("POST", "/auth/logout", {});
      } catch {}
      window.localStorage.removeItem("calshi_session_token");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/me"] });
      toast({ title: "Logged out" });
      setLocation("/auth");
    },
    onError: () => {
      window.localStorage.removeItem("calshi_session_token");
      queryClient.invalidateQueries({ queryKey: ["/me"] }).catch(() => {});
      toast({ title: "Logged out", description: "Session cleared locally." });
      setLocation("/auth");
    },
  });

  const maxStakeForSlider = useMemo(() => {
    if (!signedIn) return 500;
    const t = Math.floor(tokens);
    if (!Number.isFinite(t) || t <= 0) return 500;
    return Math.max(10, t);
  }, [signedIn, tokens]);

  async function handleTrade(marketId: string, side: "YES" | "NO") {
    if (!signedIn) {
      setLocation("/auth");
      return;
    }

    const maxStake = Math.max(0, Math.floor(tokens));
    const amount = clampInt(stake, 1, Math.max(1, maxStake));

    if (amount > tokens) {
      toast({
        title: "Not enough tokens",
        description: `You only have ${tokens.toLocaleString()} tokens.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await tradeMutation.mutateAsync({ marketId, side, amount });
      toast({ title: "Trade placed", description: `Bought ${side} (stake ${amount})` });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Could not place trade.";
      toast({ title: "Trade failed", description: msg, variant: "destructive" });
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

          <div className="flex items-center gap-3">
            {signedIn ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-border bg-secondary/40 hover:bg-secondary/70 font-black"
                    onClick={() => setLocation("/portfolio")}
                  >
                    {username}
                    <span className="mx-2 text-muted-foreground font-black">•</span>
                    {tokens.toLocaleString()}
                  </Button>

                  <Button
                    className="h-11 rounded-full bg-primary hover:bg-primary/90 text-white font-black px-6"
                    onClick={() => setLocation("/portfolio")}
                  >
                    My Holdings
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                >
                  {logoutMutation.isPending ? "Logging out…" : "Logout"}
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
        <section className="mb-10">
          <Card className="p-5 border-primary/20 bg-primary/5 rounded-[1.75rem]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-primary">Weekly Contest Ends</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Friday 5:00 PM PST • {contestEndLabel} PST
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Time remaining</div>
                <div className="text-2xl font-black tabular-nums text-foreground">{contestCountdown}</div>
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
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

            <p className="text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
              Join the official Berkeley forecasting tournament. Start with 1,000 tokens.
              <span className="block font-bold text-foreground mt-3">Verified .edu only. No purchase necessary.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search this week's markets..."
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

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden lg:block w-full max-w-sm"
          >
            <Card className="p-8 border-primary/20 bg-primary/5 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Shield className="h-8 w-8 text-primary/20" />
              </div>

              <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Market Stats</h4>

              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-black">{statsQuery.isLoading ? "—" : activeTokensStaked.toLocaleString()}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Tokens Staked</p>
                </div>

                <div>
                  <p className="text-3xl font-black">{statsQuery.isLoading ? "—" : dailyForecasters.toLocaleString()}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily Forecasters</p>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Contest ends</p>
                  <p className="text-sm font-bold text-primary mt-1">Friday • 5:00 PM PST</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Remaining: {contestCountdown}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <section className="mb-10">
          <Card className="p-6 border-border rounded-[1.5rem] bg-secondary/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Stake Amount</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how many tokens to spend per trade.
                  {signedIn ? ` Balance: ${tokens.toLocaleString()}` : " Sign in to trade."}
                </p>
              </div>

              <div className="w-full md:max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Stake</span>
                  <span className="text-sm font-black text-foreground">{clampInt(stake, 1, maxStakeForSlider).toLocaleString()}</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={maxStakeForSlider}
                  step={1}
                  value={clampInt(stake, 1, maxStakeForSlider)}
                  disabled={!signedIn || maxStakeForSlider <= 1}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-full"
                />

                <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>1</span>
                  <span>{maxStakeForSlider.toLocaleString()}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button type="button" variant="outline" className="h-9 px-3 rounded-xl border-border" disabled={!signedIn} onClick={() => setStake(10)}>
                    10
                  </Button>
                  <Button type="button" variant="outline" className="h-9 px-3 rounded-xl border-border" disabled={!signedIn} onClick={() => setStake(50)}>
                    50
                  </Button>
                  <Button type="button" variant="outline" className="h-9 px-3 rounded-xl border-border ml-auto" disabled={!signedIn} onClick={() => setStake(maxStakeForSlider)}>
                    Max
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest text-foreground">This Week’s Markets</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated live. Contest ends in <span className="font-bold text-foreground">{contestCountdown}</span> (Friday 5:00 PM PST).
                </p>
              </div>
            </div>

            <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {marketsQuery.isLoading ? (
                <Card className="p-6">Loading markets…</Card>
              ) : marketsQuery.isError ? (
                <Card className="p-6">
                  Could not load markets. <span className="text-muted-foreground text-sm">{(marketsQuery.error as any)?.message ?? ""}</span>
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
                          <Clock className="h-3.5 w-3.5" /> {market.endsAt} PST
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground leading-snug mb-6 group-hover:text-primary transition-colors line-clamp-2 h-14">
                        {market.title}
                      </h3>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <TradeButton
                          label="YES"
                          price={market.yesPrice}
                          stake={clampInt(stake, 1, maxStakeForSlider)}
                          variant="yes"
                          disabled={tradeMutation.isPending}
                          onClick={() => handleTrade(market.id, "YES")}
                        />
                        <TradeButton
                          label="NO"
                          price={market.noPrice}
                          stake={clampInt(stake, 1, maxStakeForSlider)}
                          variant="no"
                          disabled={tradeMutation.isPending}
                          onClick={() => handleTrade(market.id, "NO")}
                        />
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
                            <div className="py-4 text-sm text-muted-foreground leading-relaxed">{market.detailedRules}</div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
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
                    value={signedIn ? inviteCode || "—" : "Sign in to get a code"}
                    readOnly
                    className="bg-white/20 border-white/10 text-white font-mono text-sm h-11 focus-visible:ring-0"
                  />
                  <Button
                    size="icon"
                    className="bg-white text-primary hover:bg-white/90 shrink-0 h-11 w-11 rounded-xl"
                    disabled={!signedIn || !inviteCode}
                    onClick={() => {
                      if (!inviteCode) return;
                      navigator.clipboard.writeText(inviteCode).catch(() => {});
                      toast({ title: "Copied", description: "Invite code copied to clipboard." });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {signedIn && inviteQuery.isLoading && (
                  <div className="mt-3 text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Generating code…</div>
                )}
                {signedIn && inviteQuery.isError && (
                  <div className="mt-3 text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Could not load invite code.</div>
                )}
              </div>
              <div className="absolute -bottom-12 -right-12 h-40 w-40 bg-white/20 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-700" />
            </Card>

            <Card className="p-8 border-border rounded-[2rem] bg-secondary/30">
              <h4 className="font-black flex items-center gap-2 mb-6 uppercase tracking-widest text-sm text-foreground">
                <Trophy className="h-4 w-4 text-primary" /> Top Bears
              </h4>

              <div className="space-y-6">
                {(leaders as any[]).slice(0, 4).map((leader: any, i: number) => (
                  <div key={`${leader.name}-${i}`} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-muted-foreground w-4">#{i + 1}</span>
                      <span className="font-bold text-sm">{leader.name}</span>
                    </div>
                    <span className="font-mono text-xs font-black text-primary">{Number(leader.tokens ?? 0).toLocaleString()}</span>
                  </div>
                ))}

                {leaderboardQuery.isError && (
                  <div className="pt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    Leaderboard endpoint unavailable — showing demo data.
                  </div>
                )}
              </div>

              <Link href="/leaderboard">
                <Button
                  variant="ghost"
                  className="w-full mt-8 text-xs font-black uppercase tracking-[0.2em] h-10 hover:bg-primary/10 hover:text-primary rounded-xl"
                >
                  Full Leaderboard
                </Button>
              </Link>
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
                <a href="/privacy.txt" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                <a href="/terms.txt" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>
                <button type="button" onClick={() => setShowSupport(true)} className="hover:text-primary transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
          <p className="mt-12 pt-8 border-t border-border/50 text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.4em]">
            © 2026 CALSHI PREDICTION MARKETS • NO PURCHASE NECESSARY • PLAY TOKENS ONLY
          </p>
        </div>
      </footer>

      <Dialog open={showSupport} onOpenChange={setShowSupport}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>For help or questions, email us at:</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <a href="mailto:support@calshi.app" className="block text-center font-mono text-primary text-lg font-bold hover:underline">
              support@calshi.app
            </a>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSupport(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RulesModal open={showRules} onOpenChange={setShowRules} />
    </div>
  );
}
