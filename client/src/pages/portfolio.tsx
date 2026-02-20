import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  TrendingUp, 
  History, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Position = {
  id: string;
  marketTitle: string;
  side: "YES" | "NO" | "OVER" | "UNDER";
  amount: number;
  initialPrice: number;
  currentPrice: number;
  pnl: number;
};

type Transaction = {
  id: string;
  type: "trade" | "referral" | "daily_bonus";
  amount: number;
  description: string;
  timestamp: string;
};

const mockPositions: Position[] = [
  {
    id: "p1",
    marketTitle: "Who teaches UGBA 202B next semester?",
    side: "YES",
    amount: 250,
    initialPrice: 0.52,
    currentPrice: 0.57,
    pnl: 12.5,
  },
  {
    id: "p2",
    marketTitle: "Cal vs Stanford win probability",
    side: "NO",
    amount: 100,
    initialPrice: 0.45,
    currentPrice: 0.39,
    pnl: 6.0,
  }
];

const mockTransactions: Transaction[] = [
  { id: "t1", type: "trade", amount: -250, description: "Bought YES on UGBA 202B", timestamp: "2 hours ago" },
  { id: "t2", type: "referral", amount: 100, description: "Friend joined via code", timestamp: "5 hours ago" },
  { id: "t3", type: "daily_bonus", amount: 1000, description: "Initial sign-up tokens", timestamp: "1 day ago" },
];

export default function PortfolioPage() {
  const totalPnL = useMemo(() => mockPositions.reduce((acc, p) => acc + p.pnl, 0), []);

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
            <div className="h-8 w-8 bg-accent text-accent-foreground rounded flex items-center justify-center font-black">C</div>
            <span className="font-black uppercase tracking-tighter">Portfolio</span>
          </div>
          <div className="w-24"></div> {/* Spacer */}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="frost noise p-6 border-accent/20">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Available Balance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">1,118.5</span>
                <span className="text-xs font-mono text-accent">TOKENS</span>
              </div>
            </div>
          </Card>
          
          <Card className="frost noise p-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Active Stake</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">350</span>
                <span className="text-xs font-mono text-muted-foreground">TOKENS</span>
              </div>
            </div>
          </Card>

          <Card className="frost noise p-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Total P/L</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalPnL >= 0 ? "+" : ""}{totalPnL}
                </span>
                <span className="text-xs font-mono text-muted-foreground">TOKENS</span>
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
            {mockPositions.map(pos => (
              <Card key={pos.id} className="frost noise p-6 group hover:border-accent/30 transition-colors">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{pos.marketTitle}</h3>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline" className={`${pos.side === 'YES' || pos.side === 'OVER' ? 'border-primary text-primary-foreground bg-primary/20' : 'border-destructive text-destructive'}`}>
                        {pos.side}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">Bought at {pos.initialPrice} • Current {pos.currentPrice}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                    <div className="text-right">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Stake</p>
                      <p className="font-bold">{pos.amount} tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-muted-foreground uppercase">Profit/Loss</p>
                      <p className={`font-black ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{pos.pnl}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="hidden md:flex">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history">
            <Card className="frost noise overflow-hidden">
              <div className="divide-y divide-border">
                {mockTransactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                        {tx.amount > 0 ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold">{tx.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {tx.timestamp}
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
