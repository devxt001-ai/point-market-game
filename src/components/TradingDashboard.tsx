import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Activity } from "lucide-react";

interface StockData {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const mockStocks: StockData[] = [
  { symbol: "AAPL", company: "Apple Inc.", price: 150.25, change: 2.45, changePercent: 1.66, volume: 89234567 },
  { symbol: "TSLA", company: "Tesla Inc.", price: 198.50, change: -4.25, changePercent: -2.10, volume: 123456789 },
  { symbol: "MSFT", company: "Microsoft", price: 299.75, change: 5.25, changePercent: 1.78, volume: 45678901 },
  { symbol: "GOOGL", company: "Alphabet Inc.", price: 2485.00, change: -15.50, changePercent: -0.62, volume: 23456789 },
];

interface LeaderboardEntry {
  rank: number;
  username: string;
  portfolioValue: number;
  change: number;
  changePercent: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "TradingPro", portfolioValue: 125430.50, change: 5430.50, changePercent: 4.52 },
  { rank: 2, username: "WolfOfWallSt", portfolioValue: 118750.25, change: 3750.25, changePercent: 3.26 },
  { rank: 3, username: "StockMaster", portfolioValue: 114250.75, change: 2250.75, changePercent: 2.01 },
  { rank: 4, username: "BullRun2024", portfolioValue: 112500.00, change: 1500.00, changePercent: 1.35 },
];

export default function TradingDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-trading bg-clip-text text-transparent">
                VirtualTrader
              </h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                LIVE MARKET
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-xl font-bold text-success">{formatCurrency(110500.00)}</p>
              </div>
              <Button variant="default" className="bg-gradient-trading hover:opacity-90">
                Trade Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Quick Stats */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-profit/10 border-success/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(15750.50)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Holdings</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(94750.50)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's P&L</p>
                    <p className="text-2xl font-bold text-success">+{formatCurrency(1250.75)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
                    <p className="text-2xl font-bold text-accent">#47</p>
                  </div>
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Market Data */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Live Market Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockStocks.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/80 transition-all cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{stock.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{stock.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(stock.price)}</p>
                        <div className="flex items-center gap-1">
                          {stock.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-danger" />
                          )}
                          <span className={`text-sm font-medium ${
                            stock.change >= 0 ? 'text-success' : 'text-danger'
                          }`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-success text-success hover:bg-success/10">
                          Buy
                        </Button>
                        <Button size="sm" variant="outline" className="border-danger text-danger hover:bg-danger/10">
                          Sell
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLeaderboard.map((entry) => (
                    <div key={entry.rank} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.rank === 1 ? 'bg-gradient-profit text-white' :
                          entry.rank === 2 ? 'bg-muted text-foreground' :
                          entry.rank === 3 ? 'bg-accent/20 text-accent' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {entry.rank}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.username}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(entry.portfolioValue)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${
                          entry.change >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {entry.change >= 0 ? '+' : ''}{entry.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}