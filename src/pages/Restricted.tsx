import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";

export default function Restricted() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-muted/30" />
      </div>

      <div className="container mx-auto px-6 py-16 flex items-center justify-center">
        <Card className="w-full max-w-lg bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Restricted Area</CardTitle>
            <CardDescription>Sign in to access trading markets and dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>We protect your trading data and account security.</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="trading" className="gap-2">
                <Link to="/">Go to Sign In</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}