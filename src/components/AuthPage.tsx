import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { TrendingUp, DollarSign, BarChart3, ShieldCheck, Zap, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Account created successfully!",
        description: "You've been given 10,000 virtual points to start trading.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your trading account.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-muted/20 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-muted/30" />
      </div>

      {/* Top mini-nav */}
      <header className="container mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Point Market
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/markets" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Explore Markets
          </Link>
          <Button asChild variant="outline" size="sm" className="bg-card/70 backdrop-blur">
            <Link to="/markets" className="flex items-center gap-2">
              Live Data <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main content - centered layout */}
      <div className="container mx-auto px-6 pb-12 flex items-center">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Hero and features */}
          <div className="space-y-8">
            <div className="space-y-4 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Trade Smarter.
                </span>
                <br />
                <span className="text-foreground/80">Compete. Learn. Win.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto md:mx-0">
                Professional virtual trading with live quotes, beautiful charts, and a competitive leaderboard.
              </p>
              <div className="flex gap-3 justify-center md:justify-start">
                <Button variant="trading" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/markets">Browse Markets</Link>
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card/70 backdrop-blur border-border/40 hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-start gap-3">
                  <DollarSign className="h-6 w-6 text-success" />
                  <div>
                    <p className="font-semibold">10,000 Starting Balance</p>
                    <p className="text-sm text-muted-foreground">Practice with virtual points</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/70 backdrop-blur border-border/40 hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-start gap-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold">Real-time Quotes</p>
                    <p className="text-sm text-muted-foreground">Live prices and charts</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/70 backdrop-blur border-border/40 hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-accent" />
                  <div>
                    <p className="font-semibold">Leaderboard</p>
                    <p className="text-sm text-muted-foreground">Climb ranks and compete</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/70 backdrop-blur border-border/40 hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-semibold">Secure & Fast</p>
                    <p className="text-sm text-muted-foreground">Powered by Supabase & Vite</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="rounded-lg border border-border/40 bg-card/70 backdrop-blur p-4 text-center">
                <p className="text-2xl font-bold">1k+</p>
                <p className="text-xs text-muted-foreground">Symbols</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/70 backdrop-blur p-4 text-center">
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-xs text-muted-foreground">Access</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/70 backdrop-blur p-4 text-center">
                <p className="text-2xl font-bold">Zero</p>
                <p className="text-xs text-muted-foreground">Risk</p>
              </div>
            </div>
          </div>

          {/* Right - Auth card */}
          <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-1">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Point Market</CardTitle>
              <CardDescription>
                Sign in or create an account to start trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" name="email" type="email" placeholder="trader@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" variant="trading" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input id="signup-username" name="username" type="text" placeholder="TradingPro" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" placeholder="trader@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" variant="trading" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account & Get 10,000 Points"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <div className="mt-6 text-xs text-muted-foreground text-center">
                By continuing you agree to our terms. Virtual trading only.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}