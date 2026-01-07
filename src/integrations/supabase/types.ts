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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          table_name: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          table_name: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          table_name?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          crypto_type: string
          id: string
          status: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          crypto_type: string
          id?: string
          status?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          crypto_type?: string
          id?: string
          status?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_balance: number | null
          bio: string | null
          btc_balance: number | null
          commissions: number | null
          created_at: string | null
          eth_balance: number | null
          id: string
          interest_earned: number | null
          is_frozen: boolean
          location: string | null
          net_balance: number | null
          phone: string | null
          total_invested: number | null
          updated_at: string | null
          usdt_balance: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_balance?: number | null
          bio?: string | null
          btc_balance?: number | null
          commissions?: number | null
          created_at?: string | null
          eth_balance?: number | null
          id: string
          interest_earned?: number | null
          is_frozen?: boolean
          location?: string | null
          net_balance?: number | null
          phone?: string | null
          total_invested?: number | null
          updated_at?: string | null
          usdt_balance?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_balance?: number | null
          bio?: string | null
          btc_balance?: number | null
          commissions?: number | null
          created_at?: string | null
          eth_balance?: number | null
          id?: string
          interest_earned?: number | null
          is_frozen?: boolean
          location?: string | null
          net_balance?: number | null
          phone?: string | null
          total_invested?: number | null
          updated_at?: string | null
          usdt_balance?: number | null
          username?: string | null
        }
        Relationships: []
      }
      purchased_signals: {
        Row: {
          id: string
          price_paid: number
          purchased_at: string
          signal_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          price_paid?: number
          purchased_at?: string
          signal_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          price_paid?: number
          purchased_at?: string
          signal_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchased_signals_signal"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          profit_multiplier: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
          profit_multiplier: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          profit_multiplier?: number
        }
        Relationships: []
      }
      tradeable_assets: {
        Row: {
          api_id: string | null
          asset_type: string
          created_at: string | null
          current_price: number | null
          id: string
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          api_id?: string | null
          asset_type: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          api_id?: string | null
          asset_type?: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset_id: string | null
          current_price: number | null
          current_profit: number
          entry_price: number | null
          id: string
          initial_amount: number
          last_updated: string
          market_type: string | null
          price_change_percent: number | null
          profit_multiplier: number
          purchased_signal_id: string | null
          signal_id: string | null
          started_at: string
          status: string
          trade_direction: string | null
          trade_type: string
          trading_pair: string | null
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          current_price?: number | null
          current_profit?: number
          entry_price?: number | null
          id?: string
          initial_amount?: number
          last_updated?: string
          market_type?: string | null
          price_change_percent?: number | null
          profit_multiplier?: number
          purchased_signal_id?: string | null
          signal_id?: string | null
          started_at?: string
          status?: string
          trade_direction?: string | null
          trade_type: string
          trading_pair?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string | null
          current_price?: number | null
          current_profit?: number
          entry_price?: number | null
          id?: string
          initial_amount?: number
          last_updated?: string
          market_type?: string | null
          price_change_percent?: number | null
          profit_multiplier?: number
          purchased_signal_id?: string | null
          signal_id?: string | null
          started_at?: string
          status?: string
          trade_direction?: string | null
          trade_type?: string
          trading_pair?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_trades_purchased_signal"
            columns: ["purchased_signal_id"]
            isOneToOne: false
            referencedRelation: "purchased_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trades_signal"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "tradeable_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trading_engines: {
        Row: {
          created_at: string
          engine_type: Database["public"]["Enums"]["trading_engine_type"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_type?: Database["public"]["Enums"]["trading_engine_type"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_type?: Database["public"]["Enums"]["trading_engine_type"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          crypto_type: string
          id: string
          source: string
          status: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          crypto_type: string
          id?: string
          source?: string
          status?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          crypto_type?: string
          id?: string
          source?: string
          status?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_deposit: {
        Args: { p_admin_id: string; p_deposit_id: string }
        Returns: Json
      }
      approve_withdrawal: {
        Args: { p_admin_id: string; p_withdrawal_id: string }
        Returns: Json
      }
      calculate_trade_profit: {
        Args: { p_engine_type?: string; p_trade_id: string }
        Returns: number
      }
      check_and_liquidate_trades: { Args: never; Returns: undefined }
      deduct_trade_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      deduct_trade_from_balance: {
        Args: { p_amount: number; p_balance_source: string; p_user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { check_user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      purchase_signal: {
        Args: { p_signal_id: string; p_user_id: string }
        Returns: Json
      }
      recalculate_net_balance: { Args: { p_user_id: string }; Returns: number }
      start_trade_validated:
        | {
            Args: {
              p_asset_id: string
              p_balance_source: string
              p_entry_price: number
              p_initial_amount: number
              p_profit_multiplier: number
              p_purchased_signal_id: string
              p_signal_id: string
              p_trade_type: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_asset_id: string
              p_balance_source: string
              p_entry_price: number
              p_initial_amount: number
              p_market_type?: string
              p_profit_multiplier: number
              p_purchased_signal_id: string
              p_signal_id: string
              p_trade_type: string
              p_trading_pair?: string
              p_user_id: string
            }
            Returns: Json
          }
      stop_all_user_trades: { Args: { p_user_id: string }; Returns: Json }
      stop_single_trade: {
        Args: { p_trade_id: string; p_user_id: string }
        Returns: Json
      }
      swap_balances: {
        Args: {
          p_amount: number
          p_from_balance: string
          p_to_balance: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_trading_profits: { Args: never; Returns: undefined }
      update_asset_based_profits: { Args: never; Returns: undefined }
      update_live_interest_earned: { Args: never; Returns: undefined }
    }
    Enums: {
      trading_engine_type: "default" | "rising" | "general"
      user_role: "admin" | "user"
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
    Enums: {
      trading_engine_type: ["default", "rising", "general"],
      user_role: ["admin", "user"],
    },
  },
} as const
