import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, LogOut, Clock } from "lucide-react";

type AppNavbarProps = {
  lastUpdated?: Date | null;
  userEmail?: string | null;
  onLogout?: () => void;
  portfolioValue?: number | null;
  todaysPnL?: number | null;
};

export default function AppNavbar({
  lastUpdated,
  userEmail,
  onLogout,
  portfolioValue,
  todaysPnL,
}: AppNavbarProps) {
  const formattedUpdated = lastUpdated
    ? `${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const pnlColor = (todaysPnL ?? 0) >= 0 ? "text-success" : "text-destructive";

  return (
    <nav className="bg-gradient-to-r from-card via-card/95 to-card border-b border-border/50 shadow-lg backdrop-blur-sm sticky top-0 z-30">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Link to="/" className="block">
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Point Market
                  </span>
                </Link>
                <p className="text-xs text-muted-foreground">Trading Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="bg-success/10 border-success/30 text-success hover:bg-success/20 transition-colors px-3 py-1"
              >
                <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
                Market Open
              </Badge>

              {lastUpdated && (
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {formattedUpdated}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              {typeof portfolioValue === "number" && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(portfolioValue)}</p>
                </div>
              )}

              {typeof todaysPnL === "number" && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Today's P&L</p>
                  <p className={cn("text-lg font-bold", pnlColor)}>
                    {todaysPnL >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(todaysPnL))}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground">Welcome back!</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              )}

              <Link to="/markets">
                <Button size="sm" variant="default">Markets</Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}