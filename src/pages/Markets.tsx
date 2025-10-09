import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AppNavbar from "@/components/AppNavbar";
import { useFinnhubStream } from "@/hooks/useFinnhubStream";
import { finnhubService, type StockQuote, type MarketSymbol } from "@/services/finnhubService";
import { TrendingUp, TrendingDown, Search, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TradeModal } from "@/components/TradeModal";
import { toast } from "@/components/ui/sonner";

type SortKey = "symbol" | "price" | "changePercent" | "volume";
type FilterKey = "all" | "gainers" | "losers" | "active";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const Markets = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [allSymbols, setAllSymbols] = useState<MarketSymbol[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<MarketSymbol[]>([]);
  const [pageSymbols, setPageSymbols] = useState<MarketSymbol[]>([]);
  const [pageStocks, setPageStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDirAsc, setSortDirAsc] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 9;
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("pm_watchlist");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("pm_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load US symbol universe, then display first page quotes
      const symbols = await finnhubService.getUSSymbols();
      setAllSymbols(symbols);
      setFilteredSymbols(symbols);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError("Failed to load market list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  // Realtime search with debounce over symbol universe
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        setFilteredSymbols(allSymbols);
        setCurrentPage(1);
        return;
      }
      const next = allSymbols.filter(
        (s) => s.symbol.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q)
      );
      setFilteredSymbols(next);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query, allSymbols]);

  // Fetch quotes only for current page symbols
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageSyms = filteredSymbols.slice(start, end);
        setPageSymbols(pageSyms);
        const quotes = await Promise.all(
          pageSyms.map(async (s) => finnhubService.getStockQuote(s.symbol))
        );
        const withNames: StockQuote[] = pageSyms.map((sym, idx) => {
          const q = quotes[idx];
          if (q) {
            return {
              ...q,
              company: sym.description || q.company || sym.symbol,
            };
          }
          // Fallback stub to ensure exactly pageSize items render on each page
          return {
            symbol: sym.symbol,
            company: sym.description || sym.symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
          };
        });
        setPageStocks(withNames);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
        setError("Failed to load quotes for page.");
      } finally {
        setLoading(false);
      }
    };
    if (filteredSymbols.length > 0) run();
  }, [filteredSymbols, currentPage]);

  // Stream live prices for the current page symbols
  const symbolsForStream = useMemo(() => pageSymbols.map((s) => s.symbol), [pageSymbols]);
  const { prices: livePrices, lastUpdated: streamUpdated } = useFinnhubStream(symbolsForStream);

  // Ensure "Most Active" sorts by volume descending without filtering everything out
  useEffect(() => {
    if (filter === "active") {
      setSortKey("volume");
      setSortDirAsc(false);
    }
  }, [filter]);

  // Track price changes for visual effects
  const prevPrices = useRef<Record<string, number>>({});
  const changedPrices = useRef<Record<string, {direction: 'up'|'down', timestamp: number}>>({});
  
  // Overlay live prices onto the current page stocks
  const realtimeStocks = useMemo(() => {
    return pageStocks.map((s) => {
      const lp = livePrices[s.symbol];
      if (typeof lp === "number" && lp > 0) {
        const pc = s.previousClose ?? 0;
        const change = pc > 0 ? lp - pc : lp - s.price;
        const changePercent = pc > 0 ? ((lp - pc) / pc) * 100 : (change / (s.price || 1)) * 100;
        
        // Track price changes for visual effects
        const prevPrice = prevPrices.current[s.symbol];
        if (prevPrice && prevPrice !== lp) {
          changedPrices.current[s.symbol] = {
            direction: lp > prevPrice ? 'up' : 'down',
            timestamp: Date.now()
          };
        }
        prevPrices.current[s.symbol] = lp;
        
        return { ...s, price: lp, change, changePercent };
      }
      return s;
    });
  }, [pageStocks, livePrices]);

  const filtered = useMemo(() => {
    let arr = [...realtimeStocks];
    if (filter === "gainers") arr = arr.filter((s) => (s.changePercent ?? 0) > 0);
    if (filter === "losers") arr = arr.filter((s) => (s.changePercent ?? 0) < 0);
    // For "active", do not filter out zeros; just sort by volume
    const dir = sortDirAsc ? 1 : -1;
    arr.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === "string" && typeof vb === "string") {
        return dir * va.localeCompare(vb);
      }
      return dir * ((va as number) - (vb as number));
    });
    return arr;
  }, [realtimeStocks, filter, sortKey, sortDirAsc]);

  const toggleWatch = (symbol: string) => {
    setWatchlist((prev) => {
      const next = { ...prev, [symbol]: !prev[symbol] };
      return next;
    });
  };

  // Pagination helpers and logout must be defined within component scope
  const totalPages = Math.max(1, Math.ceil(filteredSymbols.length / pageSize));
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goPage = (p: number) => setCurrentPage(() => Math.min(totalPages, Math.max(1, p)));

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AppNavbar
        lastUpdated={streamUpdated || lastUpdated}
        userEmail={user?.email || null}
        onLogout={handleLogout}
      />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Markets
            </h1>
            <p className="text-xs text-muted-foreground">Browse stocks in real time</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(streamUpdated || lastUpdated) && (
              <span>Updated {(streamUpdated || lastUpdated)!.toLocaleTimeString()}</span>
            )}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} className="gap-1">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol or company"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-2 py-1">Sort:</Badge>
                <select
                  className="bg-card border border-border rounded px-2 py-1 text-sm"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="symbol">Symbol</option>
                  <option value="price">Price</option>
                  <option value="changePercent">Change %</option>
                  <option value="volume">Volume</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setSortDirAsc((v) => !v)} className="min-w-[72px]">
                  {sortDirAsc ? "Ascending" : "Descending"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
            <TabsTrigger value="losers">Top Losers</TabsTrigger>
            <TabsTrigger value="active">Most Active</TabsTrigger>
          </TabsList>
          <TabsContent value="all" />
          <TabsContent value="gainers" />
          <TabsContent value="losers" />
          <TabsContent value="active" />
        </Tabs>

        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="text-muted-foreground">Loading…</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive font-medium mb-2">{error}</p>
                <Button variant="outline" onClick={fetchInitial}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((s) => (
                  <Card key={s.symbol} className="bg-card/80 border border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-xl group rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg tracking-wide group-hover:text-primary transition-colors">{s.symbol}</h3>
                            <Badge variant="outline" className="text-xs">{s.company}</Badge>
                          </div>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(s.price)}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {s.change >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                            <span className={`text-sm ${s.change >= 0 ? "text-success" : "text-destructive"}`}>
                              {s.change >= 0 ? "+" : ""}
                              {s.change.toFixed(2)} ({(s.changePercent ?? 0).toFixed(2)}%)
                            </span>
                            {streamUpdated && <Badge variant="outline" className="ml-1 text-xs bg-green-500/10 text-green-500">LIVE</Badge>}
                          </div>
                          {typeof s.volume === "number" && s.volume > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Vol: {s.volume.toLocaleString()}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleWatch(s.symbol)} className="hover:bg-primary/10 rounded-full">
                          <Star className={`h-5 w-5 ${watchlist[s.symbol] ? "text-yellow-500" : "text-muted-foreground"}`} />
                        </Button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-success hover:bg-success/90 text-white"
                          onClick={() => {
                            if (!user) {
                              toast.error("Please log in to trade");
                              return;
                            }
                            setSelectedStock(s);
                            setTradeType("buy");
                            setTradeModalOpen(true);
                          }}
                        >
                          Buy
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                          onClick={() => {
                            if (!user) {
                              toast.error("Please log in to trade");
                              return;
                            }
                            setSelectedStock(s);
                            setTradeType("sell");
                            setTradeModalOpen(true);
                          }}
                        >
                          Sell
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {/* Pagination controls */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={currentPage === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={goNext} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Trade Modal */}
      {selectedStock && (
        <TradeModal
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          symbol={selectedStock.symbol}
          companyName={selectedStock.company}
          currentPrice={selectedStock.price}
          tradeType={tradeType}
          onTradeComplete={() => {
            // Refresh the page to show updated portfolio
            setCurrentPage(currentPage);
          }}
        />
      )}
    </div>
  );
};

export default Markets;