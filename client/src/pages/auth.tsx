import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ShieldCheck, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState(1);

  function handleGoogleLogin() {
    // In a real app, this would redirect to Google OAuth
    // For the mockup, we simulate the flow
    setStep(2);
    toast({ title: "Google Auth Successful", description: "Now, choose your campus handle." });
  }

  function handleCompleteProfile() {
    if (!email.endsWith(".edu") && !email.includes("berkeley")) {
      toast({ 
        title: "Access Denied", 
        description: "You must use a Berkeley .edu email to join the competition.",
        variant: "destructive" 
      });
      return;
    }
    if (username.length < 3) {
      toast({ title: "Invalid Username", description: "Username must be at least 3 characters.", variant: "destructive" });
      return;
    }

    // Simulate saving to state/backend
    localStorage.setItem("calshi_user", JSON.stringify({ email, username, tokens: 1000 }));
    toast({ title: "Welcome to Calshi!", description: "1,000 tokens have been credited to your account." });
    setLocation("/");
  }

  return (
    <div className="min-h-screen bg-background berkeley-gradient flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="frost noise p-8 border-accent/20">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-serif text-4xl font-black mb-4">
              C
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">Join the Forecast</h1>
            <p className="text-muted-foreground">Berkeley-exclusive prediction competition</p>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-accent/90 leading-relaxed">
                  <strong>Berkeley Only:</strong> Sign-in requires a valid @berkeley.edu Google account. No purchase necessary.
                </p>
              </div>
              
              <Button 
                onClick={handleGoogleLogin}
                className="w-full h-12 bg-white text-black hover:bg-gray-100 font-bold flex gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="h-4 w-4" alt="Google" />
                Sign in with Google
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Berkeley Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email"
                    placeholder="oski@berkeley.edu" 
                    className="pl-10 h-12 bg-card/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Campus Username</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="username"
                    placeholder="bear_trader_99" 
                    className="pl-10 h-12 bg-card/50"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest pl-1">This is how you'll appear on leaderboards</p>
              </div>

              <Button 
                onClick={handleCompleteProfile}
                className="w-full h-12 bg-accent text-accent-foreground font-bold"
              >
                Enter Competition
              </Button>
            </div>
          )}
        </Card>
        
        <p className="mt-8 text-center text-xs text-muted-foreground uppercase tracking-[0.2em]">
          By joining, you agree to the weekly tournament rules.
        </p>
      </motion.div>
    </div>
  );
}
