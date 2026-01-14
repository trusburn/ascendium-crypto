-- MT5-STYLE MARGIN TRADING SYSTEM
-- First drop existing functions to allow recreation

-- Drop existing functions that need to be recreated
DROP FUNCTION IF EXISTS public.stop_single_trade(uuid, uuid);
DROP FUNCTION IF EXISTS public.stop_all_user_trades(uuid);
DROP FUNCTION IF EXISTS public.check_sl_tp_triggers();
DROP FUNCTION IF EXISTS public.check_trade_expiration();
DROP FUNCTION IF EXISTS public.start_trade_validated(uuid, uuid, uuid, text, numeric, numeric, uuid, numeric, text, text, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.start_trade_validated(uuid, uuid, uuid, text, numeric, numeric, uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.start_trade_validated(uuid, uuid, uuid, text, numeric, numeric, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.start_trade_validated(uuid, uuid, uuid, text, numeric, numeric, uuid, numeric);

-- Step 1: Add margin_locked column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS margin_locked numeric DEFAULT 0;

-- Step 2: Update the net_balance recalculation
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net_balance numeric;
BEGIN
  SELECT 
    COALESCE(btc_balance, 0) + 
    COALESCE(eth_balance, 0) + 
    COALESCE(usdt_balance, 0) + 
    COALESCE(interest_earned, 0) + 
    COALESCE(commissions, 0)
  INTO v_net_balance
  FROM profiles
  WHERE id = p_user_id;
  
  UPDATE profiles 
  SET net_balance = v_net_balance, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN v_net_balance;
END;
$$;

-- Step 3: Create function to lock margin (not deduct)
CREATE OR REPLACE FUNCTION public.lock_margin_for_trade(
  p_user_id uuid, 
  p_amount numeric, 
  p_balance_source text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_current_margin NUMERIC;
  v_available NUMERIC;
  v_valid_balances text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
BEGIN
  IF NOT (p_balance_source = ANY(v_valid_balances)) THEN
    RETURN FALSE;
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', p_balance_source)
  INTO v_current_balance
  USING p_user_id;
  
  SELECT COALESCE(margin_locked, 0) INTO v_current_margin
  FROM profiles WHERE id = p_user_id;
  
  v_available := v_current_balance - v_current_margin;
  IF v_available < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE profiles 
  SET margin_locked = COALESCE(margin_locked, 0) + p_amount, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Step 4: Create function to release margin and apply P/L
CREATE OR REPLACE FUNCTION public.release_margin_and_apply_pnl(
  p_user_id uuid,
  p_margin_amount numeric,
  p_pnl numeric,
  p_balance_source text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_balances text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
BEGIN
  IF NOT (p_balance_source = ANY(v_valid_balances)) THEN
    p_balance_source := 'usdt_balance';
  END IF;
  
  -- Release the margin
  UPDATE profiles 
  SET margin_locked = GREATEST(COALESCE(margin_locked, 0) - p_margin_amount, 0), updated_at = now()
  WHERE id = p_user_id;
  
  -- Apply P/L: Profit to interest_earned, Loss from balance source
  IF p_pnl >= 0 THEN
    UPDATE profiles SET interest_earned = COALESCE(interest_earned, 0) + p_pnl, updated_at = now()
    WHERE id = p_user_id;
  ELSE
    EXECUTE format('UPDATE profiles SET %I = GREATEST(COALESCE(%I, 0) + $1, 0), updated_at = now() WHERE id = $2', p_balance_source, p_balance_source)
    USING p_pnl, p_user_id;
  END IF;
  
  PERFORM recalculate_net_balance(p_user_id);
  RETURN TRUE;
END;
$$;

-- Step 5: Create new start_trade_validated with MT5 margin locking
CREATE FUNCTION public.start_trade_validated(
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
SET search_path = public
AS $$
DECLARE
  v_trade_id uuid;
  v_engine_type text;
  v_user_engine text;
  v_global_engine text;
  v_expires_at timestamp with time zone;
  v_margin_locked boolean;
  v_actual_signal_id uuid;
  v_actual_purchased_signal_id uuid;
BEGIN
  v_actual_signal_id := CASE WHEN p_signal_id = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE p_signal_id END;
  v_actual_purchased_signal_id := CASE WHEN p_purchased_signal_id = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE p_purchased_signal_id END;

  IF p_duration_type IS NOT NULL AND p_duration_type NOT IN ('1h', '6h', '24h', '7d', 'unlimited') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid duration type');
  END IF;

  v_expires_at := CASE p_duration_type
    WHEN '1h' THEN now() + interval '1 hour'
    WHEN '6h' THEN now() + interval '6 hours'
    WHEN '24h' THEN now() + interval '24 hours'
    WHEN '7d' THEN now() + interval '7 days'
    ELSE NULL
  END;

  IF p_initial_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trade amount');
  END IF;

  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  SELECT TRIM(BOTH '"' FROM value::text) INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine, 'rising');

  IF v_engine_type = 'rising' AND v_actual_signal_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Signal required for Rising engine');
  END IF;

  IF v_engine_type = 'general' AND v_actual_signal_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Signals not allowed in General engine');
  END IF;

  -- MT5 STYLE: Lock margin instead of deducting balance
  SELECT lock_margin_for_trade(p_user_id, p_initial_amount, p_balance_source) INTO v_margin_locked;

  IF NOT v_margin_locked THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient available balance');
  END IF;

  INSERT INTO trades (
    user_id, signal_id, purchased_signal_id, trade_type, trade_direction,
    initial_amount, profit_multiplier, asset_id, entry_price, current_price, current_profit,
    trading_pair, market_type, stop_loss, take_profit, duration_type, expires_at, status
  ) VALUES (
    p_user_id,
    CASE WHEN v_engine_type = 'rising' THEN v_actual_signal_id ELSE NULL END,
    CASE WHEN v_engine_type = 'rising' THEN v_actual_purchased_signal_id ELSE NULL END,
    p_trade_type, p_trade_type, p_initial_amount, p_profit_multiplier, p_asset_id,
    p_entry_price, p_entry_price, 0,
    p_trading_pair, p_market_type, p_stop_loss, p_take_profit,
    COALESCE(p_duration_type, 'unlimited'), v_expires_at, 'active'
  )
  RETURNING id INTO v_trade_id;

  RETURN json_build_object('success', true, 'trade_id', v_trade_id, 'engine', v_engine_type, 'expires_at', v_expires_at, 'margin_locked', p_initial_amount);
END;
$$;

-- Step 6: Create new stop_single_trade
CREATE FUNCTION public.stop_single_trade(p_trade_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_calculated_profit NUMERIC;
  v_final_profit NUMERIC;
BEGIN
  SELECT value::text INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine);
  
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Trade not found'); END IF;
  IF v_trade.user_id != p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Trade does not belong to user'); END IF;
  IF v_trade.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Trade is not active'); END IF;
  
  v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
  v_final_profit := GREATEST(v_calculated_profit, -v_trade.initial_amount);
  
  UPDATE trades SET current_profit = v_final_profit, status = 'stopped', last_updated = now() WHERE id = v_trade.id;
  
  -- MT5: Release margin and apply P/L
  PERFORM release_margin_and_apply_pnl(p_user_id, v_trade.initial_amount, v_final_profit, 'usdt_balance');
  
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (p_user_id, CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, v_final_profit,
    COALESCE(v_trade.trade_type, 'buy') || ' ' || COALESCE(v_trade.trading_pair, 'Unknown') || ' | Margin: $' || v_trade.initial_amount::text || ' | P/L: $' || v_final_profit::text);
  
  RETURN jsonb_build_object('success', true, 'trade_id', v_trade.id, 'initial_amount', v_trade.initial_amount, 'final_profit', v_final_profit, 'margin_released', v_trade.initial_amount);
END;
$$;

-- Step 7: Create new stop_all_user_trades
CREATE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_profit NUMERIC := 0;
  v_total_margin NUMERIC := 0;
  v_trades_stopped INTEGER := 0;
  v_trade_details JSONB := '[]'::JSONB;
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_calculated_profit NUMERIC;
  v_final_profit NUMERIC;
BEGIN
  SELECT value::text INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine);
  
  FOR v_trade IN SELECT * FROM trades WHERE user_id = p_user_id AND status = 'active'
  LOOP
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    v_final_profit := GREATEST(v_calculated_profit, -v_trade.initial_amount);
    
    UPDATE trades SET current_profit = v_final_profit, status = 'stopped', last_updated = now() WHERE id = v_trade.id;
    
    v_trade_details := v_trade_details || jsonb_build_object(
      'id', v_trade.id, 'trade_type', v_trade.trade_type, 'initial_amount', v_trade.initial_amount,
      'profit', v_final_profit, 'entry_price', v_trade.entry_price, 'exit_price', v_trade.current_price,
      'asset_symbol', COALESCE(v_trade.trading_pair, 'N/A'), 'started_at', v_trade.started_at, 'stopped_at', now()
    );
    
    v_total_profit := v_total_profit + v_final_profit;
    v_total_margin := v_total_margin + COALESCE(v_trade.initial_amount, 0);
    v_trades_stopped := v_trades_stopped + 1;
  END LOOP;
  
  IF v_trades_stopped = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active trades to stop', 'trades_stopped', 0, 'total_profit', 0);
  END IF;
  
  -- MT5: Release all margin and apply total P/L
  PERFORM release_margin_and_apply_pnl(p_user_id, v_total_margin, v_total_profit, 'usdt_balance');
  
  RETURN jsonb_build_object('success', true, 'message', 'Trades stopped successfully', 'trades_stopped', v_trades_stopped, 
    'total_profit', ROUND(v_total_profit, 2), 'total_margin_released', v_total_margin, 'trade_details', v_trade_details);
END;
$$;

-- Step 8: Create new check_sl_tp_triggers
CREATE FUNCTION public.check_sl_tp_triggers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_rec RECORD;
  v_final_profit numeric;
  v_current_price numeric;
  v_should_close boolean;
  v_close_reason text;
  v_triggered_count integer := 0;
BEGIN
  FOR trade_rec IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active' AND (t.stop_loss IS NOT NULL OR t.take_profit IS NOT NULL)
  LOOP
    v_current_price := COALESCE(trade_rec.asset_current_price, trade_rec.current_price, trade_rec.entry_price);
    v_should_close := false;
    
    IF trade_rec.stop_loss IS NOT NULL THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price <= trade_rec.stop_loss THEN
        v_should_close := true; v_close_reason := 'Stop Loss triggered at $' || v_current_price::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price >= trade_rec.stop_loss THEN
        v_should_close := true; v_close_reason := 'Stop Loss triggered at $' || v_current_price::text;
      END IF;
    END IF;
    
    IF trade_rec.take_profit IS NOT NULL AND NOT v_should_close THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price >= trade_rec.take_profit THEN
        v_should_close := true; v_close_reason := 'Take Profit triggered at $' || v_current_price::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price <= trade_rec.take_profit THEN
        v_should_close := true; v_close_reason := 'Take Profit triggered at $' || v_current_price::text;
      END IF;
    END IF;
    
    IF v_should_close THEN
      v_final_profit := trade_rec.current_profit;
      v_triggered_count := v_triggered_count + 1;
      
      UPDATE trades SET status = 'stopped', last_updated = now() WHERE id = trade_rec.id;
      PERFORM release_margin_and_apply_pnl(trade_rec.user_id, trade_rec.initial_amount, v_final_profit, 'usdt_balance');
      
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (trade_rec.user_id, CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
        ABS(v_final_profit), v_close_reason || ' on ' || COALESCE(trade_rec.trading_pair, 'Unknown'));
    END IF;
  END LOOP;
  
  RETURN json_build_object('triggered_count', v_triggered_count);
END;
$$;

-- Step 9: Create new check_trade_expiration
CREATE FUNCTION public.check_trade_expiration()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_rec RECORD;
  v_final_profit numeric;
  v_expired_count integer := 0;
BEGIN
  FOR trade_rec IN 
    SELECT * FROM trades WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now()
  LOOP
    v_final_profit := trade_rec.current_profit;
    v_expired_count := v_expired_count + 1;
    
    UPDATE trades SET status = 'stopped', last_updated = now() WHERE id = trade_rec.id;
    PERFORM release_margin_and_apply_pnl(trade_rec.user_id, trade_rec.initial_amount, v_final_profit, 'usdt_balance');
    
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (trade_rec.user_id, CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
      ABS(v_final_profit), 'Trade expired on ' || COALESCE(trade_rec.trading_pair, 'Unknown'));
  END LOOP;
  
  RETURN json_build_object('expired_count', v_expired_count);
END;
$$;

COMMENT ON COLUMN public.profiles.margin_locked IS 'MT5-style: Amount locked as margin for active trades. Balance unchanged, just reserved.';