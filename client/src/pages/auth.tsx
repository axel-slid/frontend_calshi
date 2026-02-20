import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ShieldCheck, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GoogleLogin } from "@react-oauth/google";

/**
 * IMPORTANT:
 * We must POST /auth/complete to the BACKEND origin.
 * If you call "/auth/complete" as a relative path, it hits https://www.calshi.app/auth/complete (Vercel)
 * which returns: "Cannot POST /auth/complete".
 */
const DEFAULT_API_BASE = "https://backendcalshi-production.up.railway.app";
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.toString()?.trim() || DEFAULT_API_BASE;

export default function AuthPage() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [idToken, setIdToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleAuthed = Boolean(idToken);

  async function handleEnter() {
    const trimmedUsername = username.trim();

    if (!idToken) {
      toast({
        title: "Sign in required",
        description: "Please sign in with Google first.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedUsername.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      
      console.log("idToken length:", idToken?.length, "username:", trimmedUsername);
      
      // ✅ Force absolute URL to backend
      const res = await fetch(`${API_BASE}/auth/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          username: trimmedUsername,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Persist JWT so the app works even if third-party cookies are blocked.
      if (data?.sessionToken) {
        window.localStorage.setItem("calshi_session_token", data.sessionToken);
      }

      toast({ title: "Welcome!", description: "You're ready to trade." });
      setLocation("/");
    } catch (e: any) {
      toast({
        title: "Could not finish sign up",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <h1 className="text-3xl font-serif font-bold mb-2">
              Join the Forecast
            </h1>
            <p className="text-muted-foreground">
              Berkeley-exclusive prediction competition
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex gap-3 items-start">
              <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-accent/90 leading-relaxed">
                <strong>Berkeley Only:</strong> Sign-in requires a valid
                {" "}
                @berkeley.edu Google account.
              </p>
            </div>

            {!googleAuthed ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(cred) => {
                    const token = cred.credential;
                    if (!token) {
                      toast({
                        title: "Google sign-in failed",
                        description: "No credential returned by Google.",
                        variant: "destructive",
                      });
                      return;
                    }

                    setIdToken(token);

                    // purely UX
                    setEmail("Signed in with Google");
                    toast({
                      title: "Google sign-in complete",
                      description: "Now choose a username.",
                    });
                  }}
                  onError={() => {
                    toast({
                      title: "Google sign-in failed",
                      description: "Please try again.",
                      variant: "destructive",
                    });
                  }}
                  useOneTap={false}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Berkeley Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      className="pl-10 h-12 bg-card/50"
                      value={email}
                      disabled
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest pl-1">
                    Verified on the server on submit
                  </p>
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
                      disabled={isSubmitting}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleEnter}
                  className="w-full h-12 bg-accent text-accent-foreground font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Enter Competition"}
                </Button>

                {/* Optional: show which API base you’re using (helps debugging) */}
                {/* <p className="text-[10px] text-muted-foreground">API: {API_BASE}</p> */}
              </>
            )}
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground uppercase tracking-[0.2em]">
          By joining, you agree to the weekly tournament rules.
        </p>
      </motion.div>
    </div>
  );
}