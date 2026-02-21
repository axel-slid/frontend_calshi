import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowLeft, Search, RefreshCw, Medal } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type ApiLeaderboardResponse = {
  leaders: { name: string; tokens: number }[];
};

function formatTokens(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

export default function LeaderboardPage() {
  const [query, setQuery] = useState("");

  const leaderboardQuery = useQuery<ApiLeaderboardResponse>({
    queryKey: ["/leaderboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 15_000,
    retry: 1,
  });

  const leaders = useMemo(() => {
    const raw = (leaderboardQuery.data as any)?.leaders;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((x: any) => ({
        name: String(x?.name ?? ""),
        tokens: Number(x?.tokens ?? 0),
      }))
      .filter((x: any) => x.name.length > 0);
  }, [leaderboardQuery.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leaders;
    return leaders.filter((l) => l.name.toLowerCase().includes(q));
  }, [leaders, query]);

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const isLoading = leaderboardQuery.isLoading;
  const isError = leaderboardQuery.isError;

  function handleManualRefresh() {
    leaderboardQuery
      .refetch()
      .then(() => toast({ title: "Updated", description: "Leaderboard refreshed." }))
      .catch((e: any) =>
        toast({
          title: "Refresh failed",
          description: e?.message ?? "Try again.",
          variant: "destructive",
        }),
      );
  }

  return (
    <div className="min-h-screen bg-background berkeley-gradient p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                <h1 className="text-2xl font-serif font-bold">Leaderboard</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Top forecasters ranked by tokens (credits).
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleManualRefresh}
            disabled={leaderboardQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${leaderboardQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="frost noise border-accent/20 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search username"
                className="h-11 bg-card/50 w-full sm:w-[320px]"
                autoComplete="off"
                inputMode="text"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
              <span>{leaders.length ? `${leaders.length} shown` : "No data"}</span>
              {leaderboardQuery.isFetching ? <Badge variant="secondary">Updating</Badge> : null}
            </div>
          </div>
        </Card>

        {isError ? (
          <Card className="frost noise border-destructive/30 p-5">
            <div className="text-sm">
              <p className="font-semibold text-destructive mb-1">Couldn’t load leaderboard</p>
              <p className="text-muted-foreground">
                {(leaderboardQuery.error as any)?.message ?? "Unknown error"}
              </p>
              <div className="mt-4">
                <Button onClick={handleManualRefresh} className="bg-accent text-accent-foreground">
                  Try again
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card className="frost noise border-accent/20 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Top 3</h2>
                <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                  Live
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-12 rounded-xl bg-card/40 animate-pulse" />
                  <div className="h-12 rounded-xl bg-card/40 animate-pulse" />
                  <div className="h-12 rounded-xl bg-card/40 animate-pulse" />
                </div>
              ) : topThree.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results.</p>
              ) : (
                <div className="space-y-3">
                  {topThree.map((u, i) => (
                    <div
                      key={`${u.name}-${i}`}
                      className="flex items-center justify-between rounded-2xl border border-accent/15 bg-accent/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-accent text-accent-foreground font-black flex items-center justify-center">
                          {i === 0 ? "1" : i === 1 ? "2" : "3"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{u.name}</span>
                            {i === 0 ? (
                              <Medal className="h-4 w-4 text-accent" />
                            ) : i === 1 ? (
                              <Medal className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Medal className="h-4 w-4 text-muted-foreground/70" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-widest">
                            Tokens
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold tabular-nums">{formatTokens(u.tokens)}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest">
                          credits
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="frost noise border-accent/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Full rankings</h2>
                <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                  Top 20
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-card/40 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {rest.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No additional ranks.</div>
                  ) : (
                    rest.map((u, idx) => {
                      const rank = idx + 4; // since topThree are ranks 1-3
                      return (
                        <div
                          key={`${u.name}-${rank}`}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 text-sm text-muted-foreground tabular-nums">
                              #{rank}
                            </div>
                            <div className="font-medium">{u.name}</div>
                          </div>

                          <div className="text-right">
                            <div className="font-semibold tabular-nums">
                              {formatTokens(u.tokens)}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              credits
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-accent/15 bg-accent/5 p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span className="uppercase tracking-widest text-[10px] text-accent/90">
                    Tip
                  </span>
                </div>
                <p>
                  Rankings are based on current token balance (credits). The leaderboard refreshes automatically.
                </p>
              </div>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  );
}