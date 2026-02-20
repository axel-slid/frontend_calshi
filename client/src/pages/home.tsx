import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  PlusCircle,
  Gift,
  Shield,
  Info,
  Wallet,
  Clock,
  Trophy,
  Users,
  Copy,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type MarketType = "yesno" | "overunder";

type Market = {
  id: string;
  title: string;
  category: "Weather" | "Campus" | "Chaos" | "Dining";
  type: MarketType;
  endsAt: string;
  volume: number;
  yesPrice: number;
  detailedRules: string;
};

const finalMarkets: Market[] = [
  {
    id: "mkt-rain",
    title: "Will it rain after 5 PM today?",
    category: "Weather",
    type: "yesno",
    endsAt: "Today 5PM",
    volume: 12450,
    yesPrice: 0.35,
    detailedRules: "Resolves YES if measurable precipitation (≥ 0.01 inches) is recorded at Berkeley (NOAA / official weather station) between 5:00 PM and 11:59 PM local time."
  },
  {
    id: "mkt-rsf-capacity",
    title: "Will RSF display “Building at Capacity” at 6:00 PM today?",
    category: "Campus",
    type: "yesno",
    endsAt: "Today 6PM",
    volume: 8900,
    yesPrice: 0.62,
    detailedRules: "Resolves YES if the official capacity notice is displayed (digital sign or posted notice) at exactly 6:00 PM ± 5 minutes"
  },
  {
    id: "mkt-yikyak",
    title: "Will the YikYak post with the most Karma exceed 1,000 upvotes today?",
    category: "Chaos",
    type: "yesno",
    endsAt: "Tonight",
    volume: 15600,
    yesPrice: 0.45,
    detailedRules: "Resolves YES if, by 11:59 PM local time, the highest-karma YikYak post created within the prior 23 hours has ≥ 1,000 karma in the Berkeley geo feed."
  },
  {
    id: "mkt-protest",
    title: "Will there be a protest on Sproul Plaza today?",
    category: "Campus",
    type: "yesno",
    endsAt: "Today 6PM",
    volume: 21000,
    yesPrice: 0.28,
    detailedRules: "Resolves YES if 15+ people visibly gather with signs or chanting between 9 AM–6 PM."
  },
  {
    id: "mkt-crossroads-anthem",
    title: "Will someone stand on a Crossroads table and sing the national anthem?",
    category: "Chaos",
    type: "yesno",
    endsAt: "Tonight",
    volume: 5400,
    yesPrice: 0.08,
    detailedRules: "Resolves YES if a person is visibly standing with both feet on a dining table for ≥ 1 minute singing the national anthem. Must be audible from within a 50 feet radius."
  },
  {
    id: "mkt-morrison-thankyou",
    title: "Will someone stand in Morrison Library and say “Thank you” for 15s?",
    category: "Chaos",
    type: "yesno",
    endsAt: "Library Close",
    volume: 7200,
    yesPrice: 0.12,
    detailedRules: "The person is standing (not seated). The phrase “Thank you” is repeated continuously. Duration ≥ 15 uninterrupted seconds. Audible to a majority of the room (normal speaking volume that carries). Occurs between opening and closing hours today"
  },
  {
    id: "mkt-cafe3-vegan",
    title: "Will Cafe 3 serve Vegan chicken tenders tomorrow?",
    category: "Dining",
    type: "yesno",
    endsAt: "Tomorrow",
    volume: 11200,
    yesPrice: 0.55,
    detailedRules: "Resolves YES if Vegan Chicken Tenders are listed on the official Café 3 menu (Cal Dining website or on-site digital signage) for breakfast, lunch, or dinner tomorrow."
  }
];

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
          <DialogDescription>
            Calshi Weekly Forecast Competition
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4" /> $250 Weekly Prize
            </h4>
            <p className="text-sm">The top forecaster at the end of each week-long competition wins a $250 Amazon Gift Card.</p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">1</div>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Daily Prompts:</strong> New markets are added every day throughout the week.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">2</div>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Tokens:</strong> Start with 1,000 play tokens. No purchase necessary. No monetary value.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold border">3</div>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Verification:</strong> Must sign in with a verified @berkeley.edu email.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [signedIn, setSignedIn] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [search, setSearch] = useState("");
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("calshi_user");
    if (userStr) {
      setSignedIn(true);
      setTokens(JSON.parse(userStr).tokens || 1000);
    }
  }, []);

  const filteredMarkets = useMemo(() => {
    return finalMarkets.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

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
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
                  localStorage.removeItem("calshi_user");
                  setSignedIn(false);
                  window.location.reload();
                }}>Logout</Button>
              </>
            ) : (
              <Button onClick={() => setLocation("/auth")} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-full">Get Started</Button>
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
              <Button variant="outline" className="h-14 px-8 gap-2 rounded-2xl border-border hover:bg-secondary font-bold" onClick={() => setShowRules(true)}>
                <Info className="h-5 w-5" /> Tournament Rules
              </Button>
            </div>
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
                  <p className="text-3xl font-black">74.2k</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Tokens Staked</p>
                </div>
                <div>
                  <p className="text-3xl font-black">1.2k</p>
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
                <TabsTrigger value="all" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all">All Markets</TabsTrigger>
                <TabsTrigger value="weather" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all">Weather</TabsTrigger>
                <TabsTrigger value="campus" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-4 font-black text-sm uppercase tracking-widest transition-all">Campus</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMarkets.map(market => (
                  <Card key={market.id} className="market-card p-6 group flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="secondary" className="bg-secondary text-primary hover:bg-secondary border-none rounded-full px-3 py-1 text-[10px] uppercase font-black tracking-widest">{market.category}</Badge>
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
                        <Button className="bg-primary hover:bg-primary/90 text-white font-black py-7 rounded-2xl text-lg shadow-lg shadow-primary/20">
                          YES {Math.round(market.yesPrice * 100)}¢
                        </Button>
                        <Button variant="outline" className="border-border hover:bg-secondary text-foreground font-black py-7 rounded-2xl text-lg">
                          NO {Math.round((1 - market.yesPrice) * 100)}¢
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-border/50">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">
                          {market.volume.toLocaleString()} TOKENS TRADED
                        </span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black text-primary flex items-center gap-1 hover:no-underline hover:opacity-80">
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
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-8">
            <Card className="p-8 bg-primary text-white border-none rounded-[2rem] overflow-hidden relative group">
              <div className="relative z-10">
                <h4 className="font-black text-2xl mb-3">Invite Peers</h4>
                <p className="text-white/80 text-sm mb-6 font-medium">Earn <span className="text-white font-black">100 tokens</span> for every Bear you bring to the platform.</p>
                <div className="flex gap-2">
                  <Input value="CALSHI2026" readOnly className="bg-white/20 border-white/10 text-white font-mono text-sm h-11 focus-visible:ring-0" />
                  <Button size="icon" className="bg-white text-primary hover:bg-white/90 shrink-0 h-11 w-11 rounded-xl">
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
              <Button variant="ghost" className="w-full mt-8 text-xs font-black uppercase tracking-[0.2em] h-10 hover:bg-primary/10 hover:text-primary rounded-xl">Full Leaderboard</Button>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="border-t bg-background/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <img src="/static/logo.png" alt="Calshi" className="h-10 w-auto opacity-80 brightness-110" />
            <div className="flex flex-col items-center md:items-end gap-4">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
                Verified Berkeley .edu only
              </p>
              <div className="flex gap-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
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
