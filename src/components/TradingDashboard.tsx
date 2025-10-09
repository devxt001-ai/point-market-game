import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Activity,
  Loader2,
  LogOut,
  Clock,
  Wifi,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { finnhubService, type StockQuote } from "@/services/finnhubService";
import AppNavbar from "./AppNavbar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StockData {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  portfolioValue: number;
  change: number;
  changePercent: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    username: "TradingPro",
    portfolioValue: 125430.5,
    change: 5430.5,
    changePercent: 4.52,
  },
  {
    rank: 2,
    username: "WolfOfWall",
    portfolioValue: 118750.25,
    change: 3750.25,
    changePercent: 3.26,
  },
  {
    rank: 3,
    username: "StockMaster",
    portfolioValue: 114250.75,
    change: 2250.75,
    changePercent: 2.01,
  },
  {
    rank: 4,
    username: "BullRun2024",
    portfolioValue: 112500.0,
    change: 1500.0,
    changePercent: 1.35,
  },
];

export default function TradingDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Supabase-backed UI state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [totalHoldings, setTotalHoldings] = useState<number | null>(null);
  const [todaysPnL, setTodaysPnL] = useState<number | null>(null);
  const [myDailyChangePercent, setMyDailyChangePercent] = useState<
    number | null
  >(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [myRank, setMyRank] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Fetch real-time stock data
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        setError(null);
        const stockData = await finnhubService.getPopularStocks(6);
        setStocks(stockData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching stocks:", err);
        setError("Failed to load stock data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchStocks, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch user wallet, portfolio aggregates, and leaderboard from Supabase
  useEffect(() => {
    if (!user) return;

    const fetchSupabaseData = async () => {
      try {
        // Get application user row by auth_user_id
        const { data: appUser, error: userErr } = await supabase
          .from("users")
          .select("id, wallet_balance, total_portfolio_value, username")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (userErr) throw userErr;

        if (appUser) {
          setWalletBalance(appUser.wallet_balance ?? 0);
          setTotalHoldings(appUser.total_portfolio_value ?? null);

          // Aggregate portfolio for precise holdings and P&L (client-side reduce for safe typing)
          const { data: portfolioRows, error: portErr } = await supabase
            .from("portfolio")
            .select("current_value, realized_pnl, unrealized_pnl")
            .eq("user_id", appUser.id);

          if (portErr) throw portErr;

          if (portfolioRows && portfolioRows.length > 0) {
            const totals = portfolioRows.reduce(
              (
                acc: { total: number; realized: number; unrealized: number },
                row: {
                  current_value: number | null;
                  realized_pnl: number | null;
                  unrealized_pnl: number | null;
                }
              ) => ({
                total: acc.total + (row.current_value ?? 0),
                realized: acc.realized + (row.realized_pnl ?? 0),
                unrealized: acc.unrealized + (row.unrealized_pnl ?? 0),
              }),
              { total: 0, realized: 0, unrealized: 0 }
            );
            setTotalHoldings(
              totals.total || appUser.total_portfolio_value || null
            );
            setTodaysPnL(totals.realized + totals.unrealized);
          }

          // Leaderboard top entries
          const { data: lb, error: lbErr } = await supabase
            .from("leaderboard")
            .select(
              "rank_position, username, portfolio_value, daily_change, daily_change_percent"
            )
            .order("rank_position", { ascending: true })
            .limit(10);

          if (lbErr) throw lbErr;

          if (lb) {
            setLeaderboardData(
              lb.map((x) => ({
                rank: x.rank_position ?? 0,
                username: x.username,
                portfolioValue: x.portfolio_value,
                change: x.daily_change ?? 0,
                changePercent: x.daily_change_percent ?? 0,
              }))
            );
          }

          // Current user's leaderboard entry
          const { data: myLb, error: myLbErr } = await supabase
            .from("leaderboard")
            .select("rank_position, daily_change, daily_change_percent")
            .eq("user_id", appUser.id)
            .maybeSingle();

          if (myLbErr) throw myLbErr;

          if (myLb) {
            setMyRank(myLb.rank_position ?? null);
            if (myLb.daily_change != null) setTodaysPnL(myLb.daily_change);
            setMyDailyChangePercent(myLb.daily_change_percent ?? null);
          }
        }
      } catch (e) {
        console.error("Error fetching Supabase data:", e);
      }
    };

    fetchSupabaseData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AppNavbar
        lastUpdated={lastUpdated}
        userEmail={user?.email || null}
        onLogout={handleLogout}
        portfolioValue={totalHoldings ?? null}
        todaysPnL={todaysPnL ?? null}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enhanced Quick Stats */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Wallet Balance
                    </p>
                    <p className="text-3xl font-bold text-success mt-1">
                      {walletBalance != null
                        ? formatCurrency(walletBalance)
                        : "—"}
                    </p>
                    <p className="text-xs text-success/70 mt-1">
                      Available for trading
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-7 w-7 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Total Holdings
                    </p>
                    <p className="text-3xl font-bold text-primary mt-1">
                      {totalHoldings != null
                        ? formatCurrency(totalHoldings)
                        : "—"}
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                      Portfolio value
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-7 w-7 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                `bg-gradient-to-br to-transparent shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ` +
                (todaysPnL != null && todaysPnL < 0
                  ? "from-destructive/10 via-destructive/5 border-destructive/20"
                  : "from-success/10 via-success/5 border-success/20")
              }
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Today's P&L
                    </p>
                    <p
                      className={
                        `text-3xl font-bold mt-1 ` +
                        (todaysPnL != null && todaysPnL < 0
                          ? "text-destructive"
                          : "text-success")
                      }
                    >
                      {todaysPnL != null && todaysPnL >= 0 ? "+" : ""}
                      {todaysPnL != null
                        ? formatCurrency(Math.abs(todaysPnL))
                        : "—"}
                    </p>
                    <p
                      className={
                        `text-xs mt-1 ` +
                        (todaysPnL != null && todaysPnL < 0
                          ? "text-destructive/70"
                          : "text-success/70")
                      }
                    >
                      {myDailyChangePercent != null
                        ? `${
                            myDailyChangePercent >= 0 ? "+" : ""
                          }${myDailyChangePercent.toFixed(2)}% today`
                        : "—"}
                    </p>
                  </div>
                  <div
                    className={
                      `w-12 h-12 rounded-xl flex items-center justify-center ` +
                      (todaysPnL != null && todaysPnL < 0
                        ? "bg-destructive/20"
                        : "bg-success/20")
                    }
                  >
                    {todaysPnL != null && todaysPnL < 0 ? (
                      <TrendingDown className="h-7 w-7 text-destructive" />
                    ) : (
                      <TrendingUp className="h-7 w-7 text-success" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Leaderboard Rank
                    </p>
                    <p className="text-3xl font-bold text-accent mt-1">
                      {myRank != null ? `#${myRank}` : "—"}
                    </p>
                    <p className="text-xs text-accent/70 mt-1">
                      Top 15% globally
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Users className="h-7 w-7 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation to Markets */}
          <div className="lg:col-span-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-2 py-1">Explore</Badge>
                <Link to="/markets">
                  <Button size="sm" variant="default">Markets</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Enhanced Live Market Data */}
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">
                        Live Market Data
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Real-time stock prices from Finnhub
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <span className="text-xs text-muted-foreground">
                        Live
                      </span>
                    </div>
                    {lastUpdated && (
                      <span className="text-xs text-muted-foreground">
                        Updated: {lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">
                        Loading market data...
                      </span>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="text-destructive font-medium mb-2">
                      Failed to load market data
                    </p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="mt-4"
                    >
                      Retry
                    </Button>
                  </div>
                ) : stocks.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      No stock data available
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {stocks.map((stock) => (
                      <Card
                        key={stock.symbol}
                        className="bg-gradient-to-r from-card/50 to-card border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group"
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="font-bold text-primary text-lg">
                                  {stock.symbol.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-foreground">
                                  {stock.symbol}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {stock.company}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-foreground">
                                  {formatCurrency(stock.price)}
                                </p>
                                <div className="flex items-center gap-1 justify-end">
                                  {stock.change >= 0 ? (
                                    <TrendingUp className="h-4 w-4 text-success" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-destructive" />
                                  )}
                                  <span
                                    className={`text-sm font-medium ${
                                      stock.change >= 0
                                        ? "text-success"
                                        : "text-destructive"
                                    }`}
                                  >
                                    {stock.change >= 0 ? "+" : ""}
                                    {stock.change.toFixed(2)} (
                                    {stock.changePercent.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90 text-white px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  Buy
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-white px-6 py-2 font-medium transition-all duration-200"
                                >
                                  Sell
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-accent/5 via-card to-card border-accent/20 shadow-xl h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">
                      Leaderboard
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Top performers
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(leaderboardData?.length ? leaderboardData : []).map(
                  (entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-card/50 to-card/30 hover:from-accent/10 hover:to-accent/5 transition-all duration-300 group"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1
                            ? "bg-yellow-500/20 text-yellow-600"
                            : entry.rank === 2
                            ? "bg-gray-400/20 text-gray-600"
                            : entry.rank === 3
                            ? "bg-orange-500/20 text-orange-600"
                            : "bg-accent/20 text-accent"
                        }`}
                      >
                        {entry.rank <= 3
                          ? entry.rank === 1
                            ? "🥇"
                            : entry.rank === 2
                            ? "🥈"
                            : "🥉"
                          : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-accent transition-colors">
                          {entry.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(entry.portfolioValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-medium ${
                            entry.change >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {entry.change >= 0 ? "+" : ""}
                          {entry.changePercent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Your Position
                    </p>
                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-primary text-sm">
                          {myRank != null ? `#${myRank}` : "—"}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-primary">
                          You
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {totalHoldings != null
                            ? formatCurrency(totalHoldings)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
