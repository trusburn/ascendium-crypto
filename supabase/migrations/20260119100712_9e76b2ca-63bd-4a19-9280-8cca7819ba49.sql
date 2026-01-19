-- Remove simulated fallback from calculate_trade_profit for GENERAL engine
-- GENERAL engine MUST use real market prices - no fallback simulation

CREATE OR REPLACE FUNCTION public.calculate_trade_profit(
  p_trade_id uuid,
  p_engine_type text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_profit numeric := 0;
  v_seconds_elapsed numeric;
  v_hours_elapsed numeric;
  v_direction_multiplier numeric;
  v_price_change_pct numeric;
  v_current_price numeric;
  v_entry_price numeric;
BEGIN
  -- Get trade details
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate time elapsed
  v_seconds_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at));
  v_hours_elapsed := v_seconds_elapsed / 3600;
  
  -- Direction multiplier: BUY profits when price goes UP, SELL profits when price goes DOWN
  v_direction_multiplier := CASE 
    WHEN v_trade.trade_type = 'sell' THEN -1 
    ELSE 1 
  END;
  
  -- Get prices
  v_entry_price := COALESCE(v_trade.entry_price, 0);
  v_current_price := COALESCE(v_trade.current_price, v_entry_price);
  
  IF COALESCE(p_engine_type, 'rising') = 'rising' THEN
    -- RISING engine: Guaranteed upward profit over time
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * (v_hours_elapsed / 24);
    
    -- Apply direction for sell trades (still positive but slightly different)
    IF v_trade.trade_type = 'sell' THEN
      v_profit := v_profit * 0.95;
    END IF;
  ELSE
    -- GENERAL engine: Use REAL market price movement ONLY
    -- NO FALLBACK SIMULATION - profit stays at 0 until real prices are synced
    
    IF v_entry_price > 0 AND v_current_price > 0 AND v_current_price <> v_entry_price THEN
      -- Calculate percentage change
      v_price_change_pct := (v_current_price - v_entry_price) / v_entry_price;
      
      -- Apply to initial amount with direction
      -- BUY: profits when price goes up (positive change = positive profit)
      -- SELL: profits when price goes down (negative change * -1 = positive profit)
      v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
      
      -- Cap losses at initial amount (can't lose more than invested)
      v_profit := GREATEST(v_profit, -v_trade.initial_amount);
    ELSE
      -- No real price data yet - profit remains 0 (NO SIMULATION)
      v_profit := 0;
    END IF;
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$$;

-- Also update start_trade_validated to ensure current_price is set from tradeable_assets
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
  v_actual_entry_price numeric;
  v_asset_price numeric;
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

  -- Get the actual current price from tradeable_assets (most up-to-date)
  SELECT current_price INTO v_asset_price FROM tradeable_assets WHERE id = p_asset_id;
  
  -- Use the asset's current price, fall back to provided entry_price
  v_actual_entry_price := COALESCE(NULLIF(v_asset_price, 0), p_entry_price);
  
  IF v_actual_entry_price IS NULL OR v_actual_entry_price <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Unable to determine entry price - market data unavailable');
  END IF;

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

  -- Lock margin from selected balance
  v_margin_locked := lock_margin_for_trade(p_user_id, p_initial_amount, p_balance_source);
  IF NOT v_margin_locked THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance in ' || p_balance_source);
  END IF;

  -- Create the trade with entry_price AND current_price set to same value initially
  INSERT INTO trades (
    user_id, signal_id, purchased_signal_id, trade_type, initial_amount, 
    profit_multiplier, asset_id, entry_price, current_price, trading_pair, market_type,
    stop_loss, take_profit, duration_type, expires_at, status, trade_direction
  ) VALUES (
    p_user_id, v_actual_signal_id, v_actual_purchased_signal_id, p_trade_type, p_initial_amount,
    p_profit_multiplier, p_asset_id, v_actual_entry_price, v_actual_entry_price, p_trading_pair, p_market_type,
    p_stop_loss, p_take_profit, p_duration_type, v_expires_at, 'active', p_trade_type
  ) RETURNING id INTO v_trade_id;

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN json_build_object(
    'success', true, 
    'trade_id', v_trade_id, 
    'engine', v_engine_type,
    'entry_price', v_actual_entry_price
  );
END;
$$;