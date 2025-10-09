import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export type TradeType = "buy" | "sell";

export interface TradeParams {
  userId: string;
  symbol: string;
  quantity: number;
  price: number;
  tradeType: TradeType;
}

export interface PortfolioItem {
  id: string;
  stock_symbol: string;
  quantity: number;
  average_buy_price: number;
  current_value: number;
  total_invested: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface UserBalance {
  wallet_balance: number;
  total_portfolio_value: number;
}

export interface TradeHistoryItem {
  id: string;
  user_id: string;
  stock_symbol: string;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  trade_type: TradeType;
  order_type: string;
  created_at: string;
}

class PortfolioService {
  async getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
      if (!userId) {
        console.error("Invalid user ID provided");
        return null;
      }

      console.log("Fetching balance for auth user ID:", userId);

      // Query using auth_user_id instead of id
      const { data, error } = await supabase
        .from("users")
        .select("wallet_balance, total_portfolio_value")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user balance:", error);
        return null;
      }

      // If no data found, the user might exist but doesn't have a record in the users table
      if (!data) {
        console.log("No user data found, creating default values");
        return {
          wallet_balance: 10000,
          total_portfolio_value: 0,
        };
      }

      console.log("User balance data:", data);
      return data as UserBalance;
    } catch (error) {
      console.error("Error in getUserBalance:", error);
      return null;
    }
  }

  async getUserPortfolio(userId: string): Promise<PortfolioItem[]> {
    try {
      // First get the database user ID
      const dbUserId = await this.getUserDbId(userId);
      if (!dbUserId) {
        console.error("Could not find database user ID for auth user:", userId);
        return [];
      }

      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", dbUserId);

      if (error) {
        console.error("Error fetching portfolio:", error);
        return [];
      }

      return data as PortfolioItem[];
    } catch (error) {
      console.error("Error in getUserPortfolio:", error);
      return [];
    }
  }

  async executeTrade({
    userId,
    symbol,
    quantity,
    price,
    tradeType,
  }: TradeParams): Promise<boolean> {
    try {
      // Validate inputs
      if (!Number.isFinite(price) || price <= 0) {
        toast.error("Invalid price specified for trade");
        return false;
      }
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        toast.error("Quantity must be a positive integer");
        return false;
      }

      // Calculate total amount (rounded to 2 decimals to avoid float drift)
      const totalAmount = parseFloat((quantity * price).toFixed(2));

      // Get user's current balance
      const userBalance = await this.getUserBalance(userId);
      if (!userBalance) {
        toast.error("Failed to fetch user balance");
        return false;
      }

      // For buy orders, check if user has enough balance
      if (tradeType === "buy" && userBalance.wallet_balance < totalAmount) {
        toast.error("Insufficient funds to complete this purchase");
        return false;
      }

      // For sell orders, check if user has enough shares
      if (tradeType === "sell") {
        const portfolio = await this.getUserPortfolio(userId);
        const stockPosition = portfolio.find(
          (item) => item.stock_symbol === symbol
        );

        if (!stockPosition || stockPosition.quantity < quantity) {
          toast.error("Insufficient shares to complete this sale");
          return false;
        }
      }

      // Get the database user ID
      const dbUserId = await this.getUserDbId(userId);
      if (!dbUserId) {
        toast.error("User account not found");
        return false;
      }

      // Instead of using RPC, let's implement the trade logic directly
      if (tradeType === "buy") {
        // Update user balance
        const { error: balanceError } = await supabase
          .from("users")
          .update({ wallet_balance: userBalance.wallet_balance - totalAmount })
          .eq("auth_user_id", userId);

        if (balanceError) {
          console.error("Error updating balance:", balanceError);
          toast.error(`Failed to update balance: ${balanceError.message}`);
          return false;
        }

        // Check if user already owns this stock
        const { data: existingStock } = await supabase
          .from("portfolio")
          .select("*")
          .eq("user_id", dbUserId)
          .eq("stock_symbol", symbol)
          .maybeSingle();

        if (existingStock) {
          // Update existing position
          const newQuantity = existingStock.quantity + quantity;
          const newTotalInvested = existingStock.total_invested + totalAmount;
          const newAvgPrice = newTotalInvested / newQuantity;

          const { error: updateError } = await supabase
            .from("portfolio")
            .update({
              quantity: newQuantity,
              total_invested: newTotalInvested,
              average_buy_price: newAvgPrice,
              current_value: newQuantity * price,
              // Mark-to-market unrealized P&L using last trade price as current
              unrealized_pnl: (price - newAvgPrice) * newQuantity,
            })
            .eq("id", existingStock.id);

          if (updateError) {
            console.error("Error updating portfolio:", updateError);
            toast.error(`Failed to update portfolio: ${updateError.message}`);
            return false;
          }
        } else {
          // Create new position
          const { error: insertError } = await supabase
            .from("portfolio")
            .insert({
              user_id: dbUserId,
              stock_symbol: symbol,
              quantity: quantity,
              average_buy_price: price,
              total_invested: totalAmount,
              current_value: totalAmount,
              unrealized_pnl: 0,
              realized_pnl: 0,
            });

          if (insertError) {
            console.error("Error creating portfolio entry:", insertError);
            toast.error(
              `Failed to create portfolio entry: ${insertError.message}`
            );
            return false;
          }
        }
      } else if (tradeType === "sell") {
        // Update user balance
        const { error: balanceError } = await supabase
          .from("users")
          .update({ wallet_balance: userBalance.wallet_balance + totalAmount })
          .eq("auth_user_id", userId);

        if (balanceError) {
          console.error("Error updating balance:", balanceError);
          toast.error(`Failed to update balance: ${balanceError.message}`);
          return false;
        }

        // Get current position
        const { data: existingStock } = await supabase
          .from("portfolio")
          .select("*")
          .eq("user_id", dbUserId)
          .eq("stock_symbol", symbol)
          .single();

        // Realized P&L using average cost method
        const realizedPnL =
          (price - existingStock.average_buy_price) * quantity;

        if (existingStock.quantity === quantity) {
          // Sell all shares -> keep the row to preserve realized P&L history
          const { error: updateZeroError } = await supabase
            .from("portfolio")
            .update({
              quantity: 0,
              total_invested: 0,
              current_value: 0,
              unrealized_pnl: 0,
              realized_pnl: (existingStock.realized_pnl || 0) + realizedPnL,
            })
            .eq("id", existingStock.id);

          if (updateZeroError) {
            console.error("Error zeroing portfolio entry:", updateZeroError);
            toast.error(
              `Failed to update portfolio: ${updateZeroError.message}`
            );
            return false;
          }
        } else {
          // Sell some shares
          const newQuantity = existingStock.quantity - quantity;
          const newTotalInvested =
            existingStock.average_buy_price * newQuantity;
          const newUnrealized =
            (price - existingStock.average_buy_price) * newQuantity;

          const { error: updateError } = await supabase
            .from("portfolio")
            .update({
              quantity: newQuantity,
              total_invested: newTotalInvested,
              current_value: newQuantity * price,
              unrealized_pnl: newUnrealized,
              realized_pnl: (existingStock.realized_pnl || 0) + realizedPnL,
            })
            .eq("id", existingStock.id);

          if (updateError) {
            console.error("Error updating portfolio:", updateError);
            toast.error(`Failed to update portfolio: ${updateError.message}`);
            return false;
          }
        }
      }

      // Record the trade in trades table
      const { error: historyError } = await supabase.from("trades").insert({
        user_id: dbUserId,
        stock_symbol: symbol,
        quantity: quantity,
        price_per_share: price,
        total_amount: totalAmount,
        trade_type: tradeType,
        order_type: "market",
      });

      if (historyError) {
        console.error("Error recording trade history:", historyError);
        toast.error(`Failed to record trade: ${historyError.message}`);
        return false;
      }

      // Recompute aggregates after trade
      const { data: portfolioData } = await supabase
        .from("portfolio")
        .select("current_value, realized_pnl, unrealized_pnl")
        .eq("user_id", dbUserId);

      const holdingsValue =
        portfolioData?.reduce(
          (total, item) => total + (item.current_value ?? 0),
          0
        ) || 0;

      const newWalletBalance =
        tradeType === "buy"
          ? userBalance.wallet_balance - totalAmount
          : userBalance.wallet_balance + totalAmount;

      const totalPortfolioValue = newWalletBalance + holdingsValue;

      const { error: updateValueError } = await supabase
        .from("users")
        .update({ total_portfolio_value: totalPortfolioValue })
        .eq("auth_user_id", userId);

      if (updateValueError) {
        console.error("Error updating portfolio value:", updateValueError);
        // Non-critical error, don't return false
      }

      // Update leaderboard so home page P&L reflects realized + unrealized
      const dailyChange =
        portfolioData?.reduce(
          (sum, item) =>
            sum + (item.realized_pnl ?? 0) + (item.unrealized_pnl ?? 0),
          0
        ) || 0;
      const dailyChangePercent =
        holdingsValue > 0 ? (dailyChange / holdingsValue) * 100 : 0;

      // Leaderboard requires username and portfolio_value in Insert type
      const { data: usernameRow } = await supabase
        .from("users")
        .select("username")
        .eq("id", dbUserId)
        .maybeSingle();

      const leaderboardEntry = {
        user_id: dbUserId,
        username: usernameRow?.username ?? "Trader",
        portfolio_value: totalPortfolioValue,
        daily_change: dailyChange,
        daily_change_percent: dailyChangePercent,
      };

      const { error: lbError } = await supabase
        .from("leaderboard")
        .upsert([leaderboardEntry], { onConflict: "user_id" });

      if (lbError) {
        console.error("Error updating leaderboard:", lbError);
        // Non-critical
      }

      toast.success(
        `Successfully ${
          tradeType === "buy" ? "purchased" : "sold"
        } ${quantity} shares of ${symbol}`
      );
      return true;
    } catch (error) {
      console.error("Error executing trade:", error);
      toast.error(`Failed to execute ${tradeType} order`);
      return false;
    }
  }

  async getUserDbId(authUserId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user ID:", error);
        return null;
      }

      if (!data) {
        console.error("No user found with auth_user_id:", authUserId);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error("Error in getUserDbId:", error);
      return null;
    }
  }

  async getTradeHistory(userId: string): Promise<TradeHistoryItem[]> {
    try {
      // First get the database user ID
      const dbUserId = await this.getUserDbId(userId);
      if (!dbUserId) {
        console.error("Could not find database user ID for auth user:", userId);
        return [];
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", dbUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching trade history:", error);
        return [];
      }

      return data as TradeHistoryItem[];
    } catch (error) {
      console.error("Error in getTradeHistory:", error);
      return [];
    }
  }
}

export const portfolioService = new PortfolioService();
