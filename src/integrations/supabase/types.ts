export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      leaderboard: {
        Row: {
          all_time_change: number | null
          avatar_url: string | null
          daily_change: number | null
          daily_change_percent: number | null
          id: string
          last_updated: string | null
          monthly_change: number | null
          portfolio_value: number
          rank_position: number | null
          user_id: string | null
          username: string
          weekly_change: number | null
        }
        Insert: {
          all_time_change?: number | null
          avatar_url?: string | null
          daily_change?: number | null
          daily_change_percent?: number | null
          id?: string
          last_updated?: string | null
          monthly_change?: number | null
          portfolio_value: number
          rank_position?: number | null
          user_id?: string | null
          username: string
          weekly_change?: number | null
        }
        Update: {
          all_time_change?: number | null
          avatar_url?: string | null
          daily_change?: number | null
          daily_change_percent?: number | null
          id?: string
          last_updated?: string | null
          monthly_change?: number | null
          portfolio_value?: number
          rank_position?: number | null
          user_id?: string | null
          username?: string
          weekly_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          average_buy_price: number
          created_at: string | null
          current_value: number
          id: string
          quantity: number
          realized_pnl: number
          stock_symbol: string
          total_invested: number
          unrealized_pnl: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          average_buy_price?: number
          created_at?: string | null
          current_value?: number
          id?: string
          quantity?: number
          realized_pnl?: number
          stock_symbol: string
          total_invested?: number
          unrealized_pnl?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          average_buy_price?: number
          created_at?: string | null
          current_value?: number
          id?: string
          quantity?: number
          realized_pnl?: number
          stock_symbol?: string
          total_invested?: number
          unrealized_pnl?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          company_name: string
          created_at: string | null
          current_price: number | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          market_cap: number | null
          price_change: number | null
          price_change_percent: number | null
          symbol: string
          volume: number | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          market_cap?: number | null
          price_change?: number | null
          price_change_percent?: number | null
          symbol: string
          volume?: number | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          market_cap?: number | null
          price_change?: number | null
          price_change_percent?: number | null
          symbol?: string
          volume?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          bonus_points: number | null
          created_at: string | null
          expires_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          plan_type: string
          price: number
          starts_at: string | null
          user_id: string | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string | null
          expires_at: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_type: string
          price: number
          starts_at?: string | null
          user_id?: string | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string | null
          expires_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_type?: string
          price?: number
          starts_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          executed_at: string | null
          id: string
          limit_price: number | null
          order_type: string
          price_per_share: number
          quantity: number
          status: string | null
          stock_symbol: string
          total_amount: number
          trade_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          executed_at?: string | null
          id?: string
          limit_price?: number | null
          order_type: string
          price_per_share: number
          quantity: number
          status?: string | null
          stock_symbol: string
          total_amount: number
          trade_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          executed_at?: string | null
          id?: string
          limit_price?: number | null
          order_type?: string
          price_per_share?: number
          quantity?: number
          status?: string | null
          stock_symbol?: string
          total_amount?: number
          trade_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          subscription_expires_at: string | null
          subscription_status: string | null
          total_portfolio_value: number | null
          updated_at: string | null
          username: string
          wallet_balance: number | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          total_portfolio_value?: number | null
          updated_at?: string | null
          username: string
          wallet_balance?: number | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          total_portfolio_value?: number | null
          updated_at?: string | null
          username?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
