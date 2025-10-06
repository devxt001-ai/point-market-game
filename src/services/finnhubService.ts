// Finnhub REST API via browser-native fetch to ensure Vercel build compatibility
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY: string = import.meta.env?.VITE_FINNHUB_API_KEY ?? ""; // Configure VITE_FINNHUB_API_KEY in your environment for production deployments

export interface StockQuote {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  volume?: number;
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

// Finnhub API response interfaces
interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
  v?: number; // Volume
}

interface FinnhubError {
  message?: string;
  code?: number;
}

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubMarketStatus {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string;
  timezone: string;
  t: number;
}

export interface MarketSymbol {
  symbol: string;
  description?: string;
}

// Minimal shape returned by Finnhub's stockSymbols endpoint
interface FinnhubSymbol {
  symbol: string;
  displaySymbol?: string;
  description?: string;
  type?: string;
}

class FinnhubService {
  private readonly popularStocks = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "TSLA",
    "META",
    "NVDA",
    "NFLX",
  ];

  /**
   * Get real-time quote for a single stock
   */
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const res = await fetch(
        `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
      const data: FinnhubQuoteResponse = await res.json();
      if (!data || data.c === 0) return null;
      return {
        symbol,
        company: symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        previousClose: data.pc,
        volume: data.v,
      };
    } catch (error) {
      console.error(`Error in getStockQuote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get company profile for a stock
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const res = await fetch(
        `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
      const data: CompanyProfile = await res.json();
      if (!data || !data.name) return null;
      return data;
    } catch (error) {
      console.error(`Error in getCompanyProfile for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time quotes for multiple popular stocks
   */
  async getPopularStocks(limit: number = 6): Promise<StockQuote[]> {
    try {
      const symbols = this.popularStocks.slice(0, limit);
      const promises = symbols.map(async (symbol) => {
        const [quote, profile] = await Promise.all([
          this.getStockQuote(symbol),
          this.getCompanyProfile(symbol),
        ]);

        if (quote && profile) {
          return {
            ...quote,
            company: profile.name,
          };
        }

        return quote;
      });

      const results = await Promise.all(promises);
      return results.filter((stock): stock is StockQuote => stock !== null);
    } catch (error) {
      console.error("Error fetching popular stocks:", error);
      return [];
    }
  }

  /**
   * Search for stocks by query
   */
  async searchStocks(query: string): Promise<FinnhubSearchResult["result"]> {
    try {
      const res = await fetch(
        `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data: FinnhubSearchResult = await res.json();
      return data?.result || [];
    } catch (error) {
      console.error(`Error in searchStocks for ${query}:`, error);
      return [];
    }
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<FinnhubMarketStatus | null> {
    try {
      const res = await fetch(
        `${FINNHUB_BASE}/market/status?exchange=US&token=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Market status failed: ${res.status}`);
      const data: FinnhubMarketStatus = await res.json();
      return data || null;
    } catch (error) {
      console.error("Error in getMarketStatus:", error);
      return null;
    }
  }

  /**
   * Get list of US stock symbols to power pagination and search
   */
  async getUSSymbols(limit?: number): Promise<MarketSymbol[]> {
    try {
      const res = await fetch(
        `${FINNHUB_BASE}/stock/symbol?exchange=US&token=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Symbols fetch failed: ${res.status}`);
      const symbols: FinnhubSymbol[] = await res.json();
      const mapped: MarketSymbol[] = (symbols || []).map((s: FinnhubSymbol) => ({
        symbol: s.symbol,
        description: s.description || s.displaySymbol || s.symbol,
      }));
      return typeof limit === "number" ? mapped.slice(0, limit) : mapped;
    } catch (error) {
      const popular = await this.getPopularStocks(100);
      return popular.map((p) => ({ symbol: p.symbol, description: p.company || p.symbol }));
    }
  }
}

export const finnhubService = new FinnhubService();
export default finnhubService;
