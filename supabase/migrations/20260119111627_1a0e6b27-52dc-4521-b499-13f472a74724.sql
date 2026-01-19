
-- =============================================================================
-- PROPER TRADING FUND-FLOW LOGIC
-- =============================================================================
-- 1. OPEN TRADE: Deduct from wallet → Add to total_invested → Create trade
-- 2. ACTIVE: Only current_profit changes (no balance updates)
-- 3. CLOSE TRADE: Return funds to wallet → Add profit to interest_earned → Reduce total_invested
-- =============================================================================

-- Drop existing functions to recreate with new logic
DROP FUNCTION IF EXISTS public.start_trade_validated(uuid, uuid, uuid, text, numeric, numeric, uuid, numeric, text, text, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.stop_single_trade(uuid, uuid);
DROP FUNCTION IF EXISTS public.stop_all_user_trades(uuid);

-- =============================================================================
-- OPEN TRADE FUNCTION
-- Deducts initial_amount from selected wallet, adds to total_invested
-- =============================================================================
CREATE OR REPLACE FUNCTION public.start_trade_validated(
  p_user_id uuid,
  p_signal_id uuid,
  p_purchased_signal_id uuid,
  p_trade_type text,
  p_initial_amount numeric,
  p_profit_multiplier numeric,
  p_asset_id uuid,
  p_entry_price numeric,
  p_balance_source text,
  p_trading_pair text DEFAULT NULL,
  p_market_type text DEFAULT 'crypto',
  p_stop_loss numeric DEFAULT NULL,
  p_take_profit numeric DEFAULT NULL,
  p_duration_type text DEFAULT 'unlimited'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id uuid;
  v_engine_type text;
  v_user_engine text;
  v_global_engine text;
  v_expires_at timestamp with time zone;
  v_actual_signal_id uuid;
  v_actual_purchased_signal_id uuid;
  v_actual_entry_price numeric;
  v_asset_price numeric;
  v_current_balance numeric;
  v_valid_balances text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
BEGIN
  -- Null UUID handling
  v_actual_signal_id := CASE WHEN p_signal_id = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE p_signal_id END;
  v_actual_purchased_signal_id := CASE WHEN p_purchased_signal_id = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE p_purchased_signal_id END;

  -- Validate duration
  IF p_duration_type IS NOT NULL AND p_duration_type NOT IN ('1h', '6h', '24h', '7d', 'unlimited') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid duration type');
  END IF;

  -- Calculate expiration
  v_expires_at := CASE p_duration_type
    WHEN '1h' THEN now() + interval '1 hour'
    WHEN '6h' THEN now() + interval '6 hours'
    WHEN '24h' THEN now() + interval '24 hours'
    WHEN '7d' THEN now() + interval '7 days'
    ELSE NULL
  END;

  -- Validate amount
  IF p_initial_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trade amount');
  END IF;

  -- Validate balance source
  IF NOT (p_balance_source = ANY(v_valid_balances)) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid balance source: ' || p_balance_source);
  END IF;

  -- Get current balance from selected source
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1 FOR UPDATE', p_balance_source)
  INTO v_current_balance
  USING p_user_id;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_initial_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance. Available: $' || v_current_balance::text);
  END IF;

  -- Get real entry price from tradeable_assets
  SELECT current_price INTO v_asset_price FROM tradeable_assets WHERE id = p_asset_id;
  v_actual_entry_price := COALESCE(NULLIF(v_asset_price, 0), p_entry_price);
  
  IF v_actual_entry_price IS NULL OR v_actual_entry_price <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Unable to determine entry price - market data unavailable');
  END IF;

  -- Get engine type
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  SELECT TRIM(BOTH '"' FROM value::text) INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
    v_engine_type := COALESCE(v_global_engine, 'rising');
  ELSE
    v_engine_type := v_user_engine;
  END IF;

  -- Engine-specific validation
  IF v_engine_type = 'rising' AND v_actual_signal_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Rising engine requires a signal');
  END IF;
  IF v_engine_type = 'general' AND v_actual_signal_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'General engine does not use signals');
  END IF;

  -- =========================================================================
  -- FUND FLOW: DEDUCT FROM WALLET, ADD TO TOTAL_INVESTED
  -- =========================================================================
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) - $1,
        total_invested = COALESCE(total_invested, 0) + $1,
        updated_at = now()
    WHERE id = $2
  ', p_balance_source, p_balance_source)
  USING p_initial_amount, p_user_id;

  -- Recalculate net_balance
  PERFORM recalculate_net_balance(p_user_id);

  -- Create the trade record
  INSERT INTO trades (
    user_id, signal_id, purchased_signal_id, trade_type, initial_amount, 
    profit_multiplier, asset_id, entry_price, current_price, trading_pair, market_type,
    stop_loss, take_profit, duration_type, expires_at, status, trade_direction, current_profit
  ) VALUES (
    p_user_id, v_actual_signal_id, v_actual_purchased_signal_id, p_trade_type, p_initial_amount,
    p_profit_multiplier, p_asset_id, v_actual_entry_price, v_actual_entry_price, p_trading_pair, p_market_type,
    p_stop_loss, p_take_profit, p_duration_type, v_expires_at, 'active', p_trade_type, 0
  ) RETURNING id INTO v_trade_id;

  -- Create transaction record for the deduction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 
    'trade_open', 
    -p_initial_amount,
    'Opened ' || p_trade_type || ' trade on ' || COALESCE(p_trading_pair, 'Unknown') || ' | Entry: $' || v_actual_entry_price::text
  );

  RETURN json_build_object(
    'success', true, 
    'trade_id', v_trade_id, 
    'engine', v_engine_type,
    'entry_price', v_actual_entry_price,
    'amount_deducted', p_initial_amount,
    'balance_source', p_balance_source
  );
END;
$$;

-- =============================================================================
-- CLOSE SINGLE TRADE FUNCTION
-- Returns funds to wallet, adds profit to interest_earned, reduces total_invested
-- =============================================================================
CREATE OR REPLACE FUNCTION public.stop_single_trade(p_trade_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_final_profit NUMERIC;
  v_exit_price NUMERIC;
  v_asset_price NUMERIC;
  v_return_amount NUMERIC;
BEGIN
  -- Get global engine
  SELECT value::text INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  -- Get user engine
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine);
  
  -- Get trade with current asset price (lock row)
  SELECT t.*, ta.current_price as live_asset_price
  INTO v_trade 
  FROM trades t
  LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
  WHERE t.id = p_trade_id
  FOR UPDATE OF t;
  
  IF v_trade IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found'); 
  END IF;
  IF v_trade.user_id != p_user_id THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade does not belong to user'); 
  END IF;
  IF v_trade.status != 'active' THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade is not active'); 
  END IF;
  
  -- Get exit price (latest asset price)
  v_exit_price := COALESCE(v_trade.live_asset_price, v_trade.current_price, v_trade.entry_price);
  
  -- Calculate final P/L based on actual price movement
  IF v_trade.entry_price IS NOT NULL AND v_trade.entry_price > 0 AND v_exit_price IS NOT NULL THEN
    -- P/L = (exit - entry) / entry × initial_amount × direction
    v_final_profit := (v_exit_price - v_trade.entry_price) 
                     / v_trade.entry_price
                     * v_trade.initial_amount
                     * CASE WHEN COALESCE(v_trade.trade_direction, v_trade.trade_type) = 'buy' THEN 1 ELSE -1 END;
    
    -- For rising engine, ensure non-negative
    IF v_engine_type = 'rising' THEN
      v_final_profit := GREATEST(v_final_profit, 0);
    END IF;
    
    -- Cap losses at initial amount (can't lose more than invested)
    v_final_profit := GREATEST(v_final_profit, -v_trade.initial_amount);
  ELSE
    v_final_profit := COALESCE(v_trade.current_profit, 0);
    v_final_profit := GREATEST(v_final_profit, -v_trade.initial_amount);
  END IF;
  
  v_final_profit := ROUND(v_final_profit, 2);
  
  -- Calculate return amount (initial + profit, but never negative)
  v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);
  
  -- Update trade with final state
  UPDATE trades 
  SET current_profit = v_final_profit, 
      current_price = v_exit_price,
      status = 'stopped', 
      last_updated = now() 
  WHERE id = v_trade.id;
  
  -- =========================================================================
  -- FUND FLOW: RETURN FUNDS TO WALLET
  -- =========================================================================
  -- Return initial_amount + profit to usdt_balance (or original source if tracked)
  UPDATE profiles 
  SET usdt_balance = COALESCE(usdt_balance, 0) + v_return_amount,
      total_invested = GREATEST(COALESCE(total_invested, 0) - v_trade.initial_amount, 0),
      updated_at = now()
  WHERE id = p_user_id;
  
  -- If profit > 0, also add to interest_earned (tracks cumulative profits)
  IF v_final_profit > 0 THEN
    UPDATE profiles 
    SET interest_earned = COALESCE(interest_earned, 0) + v_final_profit,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Recalculate net_balance
  PERFORM recalculate_net_balance(p_user_id);
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 
    CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
    v_final_profit,
    'Closed ' || COALESCE(v_trade.trade_direction, v_trade.trade_type, 'buy') || ' ' || COALESCE(v_trade.trading_pair, 'Unknown') || 
    ' | Entry: $' || COALESCE(v_trade.entry_price::text, '0') || 
    ' | Exit: $' || COALESCE(v_exit_price::text, '0') ||
    ' | Invested: $' || v_trade.initial_amount::text || 
    ' | P/L: ' || CASE WHEN v_final_profit >= 0 THEN '+' ELSE '' END || '$' || v_final_profit::text ||
    ' | Returned: $' || v_return_amount::text
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'trade_id', v_trade.id, 
    'entry_price', v_trade.entry_price,
    'exit_price', v_exit_price,
    'initial_amount', v_trade.initial_amount, 
    'final_profit', v_final_profit, 
    'returned_to_wallet', v_return_amount
  );
END;
$$;

-- =============================================================================
-- CLOSE ALL USER TRADES FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_profit NUMERIC := 0;
  v_total_returned NUMERIC := 0;
  v_total_invested_release NUMERIC := 0;
  v_trades_stopped INTEGER := 0;
  v_trade_details JSONB := '[]'::JSONB;
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_calculated_profit NUMERIC;
  v_final_profit NUMERIC;
  v_exit_price NUMERIC;
  v_return_amount NUMERIC;
BEGIN
  SELECT value::text INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine);
  
  FOR v_trade IN 
    SELECT t.*, ta.current_price as live_asset_price
    FROM trades t
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.user_id = p_user_id AND t.status = 'active'
    FOR UPDATE OF t
  LOOP
    -- Get exit price
    v_exit_price := COALESCE(v_trade.live_asset_price, v_trade.current_price, v_trade.entry_price);
    
    -- Calculate profit
    IF v_trade.entry_price IS NOT NULL AND v_trade.entry_price > 0 AND v_exit_price IS NOT NULL THEN
      v_calculated_profit := (v_exit_price - v_trade.entry_price) 
                            / v_trade.entry_price
                            * v_trade.initial_amount
                            * CASE WHEN COALESCE(v_trade.trade_direction, v_trade.trade_type) = 'buy' THEN 1 ELSE -1 END;
      IF v_engine_type = 'rising' THEN
        v_calculated_profit := GREATEST(v_calculated_profit, 0);
      END IF;
    ELSE
      v_calculated_profit := COALESCE(v_trade.current_profit, 0);
    END IF;
    
    v_final_profit := ROUND(GREATEST(v_calculated_profit, -v_trade.initial_amount), 2);
    v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);
    
    -- Update trade
    UPDATE trades 
    SET current_profit = v_final_profit, 
        current_price = v_exit_price,
        status = 'stopped', 
        last_updated = now() 
    WHERE id = v_trade.id;
    
    v_trade_details := v_trade_details || jsonb_build_object(
      'id', v_trade.id, 
      'trade_type', v_trade.trade_type, 
      'initial_amount', v_trade.initial_amount,
      'profit', v_final_profit, 
      'returned', v_return_amount,
      'entry_price', v_trade.entry_price, 
      'exit_price', v_exit_price,
      'asset_symbol', COALESCE(v_trade.trading_pair, 'N/A')
    );
    
    v_total_profit := v_total_profit + v_final_profit;
    v_total_returned := v_total_returned + v_return_amount;
    v_total_invested_release := v_total_invested_release + v_trade.initial_amount;
    v_trades_stopped := v_trades_stopped + 1;
  END LOOP;
  
  IF v_trades_stopped = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active trades to stop', 'trades_stopped', 0);
  END IF;
  
  -- =========================================================================
  -- FUND FLOW: RETURN ALL FUNDS TO WALLET
  -- =========================================================================
  UPDATE profiles 
  SET usdt_balance = COALESCE(usdt_balance, 0) + v_total_returned,
      total_invested = GREATEST(COALESCE(total_invested, 0) - v_total_invested_release, 0),
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Add positive profits to interest_earned
  IF v_total_profit > 0 THEN
    UPDATE profiles 
    SET interest_earned = COALESCE(interest_earned, 0) + v_total_profit,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Recalculate net_balance
  PERFORM recalculate_net_balance(p_user_id);
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 
    CASE WHEN v_total_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
    v_total_profit,
    'Closed ' || v_trades_stopped || ' trades | Total P/L: ' || 
    CASE WHEN v_total_profit >= 0 THEN '+' ELSE '' END || '$' || ROUND(v_total_profit, 2)::text ||
    ' | Returned to wallet: $' || ROUND(v_total_returned, 2)::text
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'All trades closed successfully', 
    'trades_stopped', v_trades_stopped, 
    'total_profit', ROUND(v_total_profit, 2),
    'total_returned_to_wallet', ROUND(v_total_returned, 2),
    'trade_details', v_trade_details
  );
END;
$$;

-- =============================================================================
-- UPDATE recalculate_net_balance to include active trade equity
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance numeric;
  v_active_trade_equity numeric;
BEGIN
  -- Calculate equity from active trades (initial_amount + current_profit)
  SELECT COALESCE(SUM(initial_amount + current_profit), 0)
  INTO v_active_trade_equity
  FROM trades
  WHERE user_id = p_user_id AND status = 'active';

  -- Net balance = all wallet balances + active trade equity
  UPDATE profiles
  SET net_balance = COALESCE(btc_balance, 0) + 
                    COALESCE(eth_balance, 0) + 
                    COALESCE(usdt_balance, 0) + 
                    COALESCE(interest_earned, 0) + 
                    COALESCE(commissions, 0) +
                    v_active_trade_equity,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING net_balance INTO v_new_balance;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;
