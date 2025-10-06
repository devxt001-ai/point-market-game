import finnhub from "finnhub";

// Initialize Finnhub client with API key directly
const finnhubClient = new finnhub.DefaultApi(
  "d3da5rpr01qtc6ejhlcgd3da5rpr01qtc6ejhld0"
);

export interface StockQuote {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
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
      return new Promise<StockQuote | null>((resolve, reject) => {
        finnhubClient.quote(
          symbol,
          (error: FinnhubError | null, data: FinnhubQuoteResponse) => {
            if (error) {
              console.error(`Error fetching quote for ${symbol}:`, error);
              reject(error);
              return;
            }

            if (!data || data.c === 0) {
              resolve(null);
              return;
            }

            const quote: StockQuote = {
              symbol,
              company: symbol, // We'll get company name separately
              price: data.c, // Current price
              change: data.d, // Change
              changePercent: data.dp, // Percent change
              volume: data.v, // Volume (if available)
            };

            resolve(quote);
          }
        );
      });
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
      return new Promise<CompanyProfile | null>((resolve, reject) => {
        finnhubClient.companyProfile2(
          { symbol: symbol },
          (error: FinnhubError | null, data: CompanyProfile) => {
            if (error) {
              console.error(
                `Error fetching company profile for ${symbol}:`,
                error
              );
              reject(error);
              return;
            }

            if (!data || !data.name) {
              resolve(null);
              return;
            }

            resolve(data as CompanyProfile);
          }
        );
      });
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
      return new Promise<FinnhubSearchResult["result"]>((resolve, reject) => {
        finnhubClient.symbolSearch(
          query,
          (error: FinnhubError | null, data: FinnhubSearchResult) => {
            if (error) {
              console.error(`Error searching stocks for ${query}:`, error);
              reject(error);
              return;
            }

            resolve(data?.result || []);
          }
        );
      });
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
      return new Promise<FinnhubMarketStatus | null>((resolve, reject) => {
        finnhubClient.marketStatus(
          "US",
          (error: FinnhubError | null, data: FinnhubMarketStatus) => {
            if (error) {
              console.error("Error fetching market status:", error);
              reject(error);
              return;
            }

            resolve(data);
          }
        );
      });
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
      const symbols: FinnhubSymbol[] = await new Promise((resolve, reject) => {
        // Finnhub SDK expects (exchange, opts, callback); pass empty opts to avoid callback mis-detection
        finnhubClient.stockSymbols("US", {}, (error: FinnhubError | null, data: FinnhubSymbol[]) => {
          if (error) {
            console.error("Error fetching US symbols:", error);
            reject(error);
            return;
          }
          resolve(data || []);
        });
      });

      const mapped: MarketSymbol[] = (symbols || []).map((s: FinnhubSymbol) => ({
        symbol: s.symbol,
        description: s.description || s.displaySymbol || s.symbol,
      }));

      return typeof limit === "number" ? mapped.slice(0, limit) : mapped;
    } catch (error) {
      // Fallback to popular stocks if symbol list fails
      const popular = await this.getPopularStocks(100);
      return popular.map((p) => ({ symbol: p.symbol, description: p.company || p.symbol }));
    }
  }
}

export const finnhubService = new FinnhubService();
export default finnhubService;
