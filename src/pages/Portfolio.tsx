import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AppNavbar from "@/components/AppNavbar";
import { useAuth } from "@/hooks/useAuth";
import {
  portfolioService,
  PortfolioItem,
  UserBalance,
  TradeHistoryItem,
} from "@/services/portfolioService";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { TradeModal } from "@/components/TradeModal";
import { finnhubService } from "@/services/finnhubService";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount
  );

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const Portfolio = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("holdings");
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedCurrentPrice, setSelectedCurrentPrice] = useState<number>(0);
  const [selectedAvgBuyPrice, setSelectedAvgBuyPrice] = useState<number>(0);
  const [selectedHeldQuantity, setSelectedHeldQuantity] = useState<number>(0);
  const [realizedPnLTotal, setRealizedPnLTotal] = useState<number | null>(null);

  const fetchPortfolioData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch portfolio holdings
      const holdings = await portfolioService.getUserPortfolio(user.id);
      setPortfolio(holdings);
      // Compute realized P&L total across all positions (including zero-quantity rows)
      const realizedTotal = holdings.reduce(
        (sum, h) => sum + (h.realized_pnl ?? 0),
        0
      );
      setRealizedPnLTotal(realizedTotal);

      // Fetch trade history
      const trades = await portfolioService.getTradeHistory(user.id);
      setTradeHistory(trades);

      // Fetch user balance
      const balance = await portfolioService.getUserBalance(user.id);
      if (balance) {
        setUserBalance(balance.wallet_balance);
        setTotalPortfolioValue(balance.total_portfolio_value);
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      toast.error("Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [user?.id]);

  const handleRefresh = () => {
    fetchPortfolioData();
    toast.success("Portfolio data refreshed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AppNavbar userEmail={user?.email || null} onLogout={() => {}} />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Portfolio
            </h1>
            <p className="text-xs text-muted-foreground">
              Track your investments
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userBalance !== null
                  ? formatCurrency(userBalance)
                  : "Loading..."}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPortfolioValue !== null
                  ? formatCurrency(totalPortfolioValue)
                  : "Loading..."}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userBalance !== null && totalPortfolioValue !== null
                  ? formatCurrency(userBalance + totalPortfolioValue)
                  : "Loading..."}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Stock Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Loading…</span>
                    </div>
                  </div>
                ) : portfolio.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      You don't have any stocks in your portfolio yet.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => (window.location.href = "/markets")}
                    >
                      Browse Markets
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Symbol</th>
                          <th className="text-right py-3 px-4">Quantity</th>
                          <th className="text-right py-3 px-4">Avg. Price</th>
                          <th className="text-right py-3 px-4">
                            Current Value
                          </th>
                          <th className="text-right py-3 px-4">P&L</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio
                          .filter((item) => item.quantity > 0)
                          .map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border/40 hover:bg-muted/30"
                          >
                            <td className="py-3 px-4 font-medium">
                              {item.stock_symbol}
                            </td>
                            <td className="text-right py-3 px-4">
                              {item.quantity}
                            </td>
                            <td className="text-right py-3 px-4">
                              {formatCurrency(item.average_buy_price)}
                            </td>
                            <td className="text-right py-3 px-4">
                              {formatCurrency(item.current_value)}
                            </td>
                            <td className="text-right py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                {item.unrealized_pnl >= 0 ? (
                                  <TrendingUp className="h-4 w-4 text-success" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                )}
                                <span
                                  className={
                                    item.unrealized_pnl >= 0
                                      ? "text-success"
                                      : "text-destructive"
                                  }
                                >
                                  {formatCurrency(item.unrealized_pnl)}
                                </span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                disabled={item.quantity <= 0}
                                onClick={async () => {
                                  try {
                                    const quote = await finnhubService.getStockQuote(item.stock_symbol);
                                    const current = quote?.price ?? item.average_buy_price;
                                    const company = quote?.company ?? item.stock_symbol;
                                    setSelectedSymbol(item.stock_symbol);
                                    setSelectedCompany(company);
                                    setSelectedCurrentPrice(current);
                                    setSelectedAvgBuyPrice(item.average_buy_price);
                                    setSelectedHeldQuantity(item.quantity);
                                    setTradeModalOpen(true);
                                  } catch (e) {
                                    setSelectedSymbol(item.stock_symbol);
                                    setSelectedCompany(item.stock_symbol);
                                    setSelectedCurrentPrice(item.average_buy_price);
                                    setSelectedAvgBuyPrice(item.average_buy_price);
                                    setSelectedHeldQuantity(item.quantity);
                                    setTradeModalOpen(true);
                                  }
                                }}
                              >
                                Sell
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Loading…</span>
                    </div>
                  </div>
                ) : tradeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No transactions yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Symbol</th>
                          <th className="text-left py-3 px-4">Type</th>
                          <th className="text-right py-3 px-4">Quantity</th>
                          <th className="text-right py-3 px-4">Price</th>
                          <th className="text-right py-3 px-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeHistory.map((trade) => (
                          <tr
                            key={trade.id}
                            className="border-b border-border/40 hover:bg-muted/30"
                          >
                            <td className="py-3 px-4 text-sm">
                              {formatDate(trade.created_at)}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {trade.stock_symbol}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  trade.trade_type === "buy"
                                    ? "bg-success/20 text-success"
                                    : "bg-destructive/20 text-destructive"
                                }
                              >
                                {trade.trade_type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">
                              {trade.quantity}
                            </td>
                            <td className="text-right py-3 px-4">
                              {formatCurrency(trade.price_per_share)}
                            </td>
                            <td className="text-right py-3 px-4 font-medium">
                              {formatCurrency(trade.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Trade Modal for selling from holdings */}
      {tradeModalOpen && selectedSymbol && (
        <TradeModal
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          symbol={selectedSymbol}
          companyName={selectedCompany}
          currentPrice={selectedCurrentPrice}
          tradeType={"sell"}
          // pass insights for sell
          avgBuyPrice={selectedAvgBuyPrice}
          heldQuantity={selectedHeldQuantity}
          onTradeComplete={() => {
            // Refresh portfolio and balance
            fetchPortfolioData();
          }}
        />
      )}

      {/* Realized P&L summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Realized P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (realizedPnLTotal ?? 0) >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {realizedPnLTotal !== null
                ? formatCurrency(realizedPnLTotal)
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Portfolio;
