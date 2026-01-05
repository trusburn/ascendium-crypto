-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.stop_all_user_trades(uuid);
DROP FUNCTION IF EXISTS public.sync_trading_profits();
DROP FUNCTION IF EXISTS public.update_live_interest_earned();
DROP FUNCTION IF EXISTS public.update_trade_profits();

-- Create function to calculate and update trade profits based on trading engine
-- This is the ONLY place where profit is calculated
CREATE OR REPLACE FUNCTION public.calculate_trade_profit(
  p_trade_id UUID,
  p_engine_type TEXT DEFAULT 'rising'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trade RECORD;
  v_hours_elapsed NUMERIC;
  v_days_elapsed NUMERIC;
  v_profit NUMERIC;
  v_volatility NUMERIC;
BEGIN
  -- Get trade details
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate time elapsed
  v_hours_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at)) / 3600;
  v_days_elapsed := v_hours_elapsed / 24;
  
  IF p_engine_type = 'rising' THEN
    -- Rising engine: Always positive growth
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed;
  ELSE
    -- General engine: Fluctuating profits (can be negative)
    -- Use a deterministic but varying calculation based on time
    v_volatility := SIN(EXTRACT(EPOCH FROM now()) / 10000 + ASCII(SUBSTRING(v_trade.id::text, 1, 1))) * 0.5;
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed * (1 + v_volatility);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$$;

-- Create function to sync trading profits for all active trades
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_profit NUMERIC;
BEGIN
  -- Get global trading engine setting
  SELECT value::text INTO v_global_engine 
  FROM admin_settings 
  WHERE key = 'global_trading_engine';
  
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  -- Update each active trade's current_profit
  FOR v_trade IN SELECT * FROM trades WHERE status = 'active' LOOP
    -- Get user-specific engine or use global
    SELECT engine_type::text INTO v_user_engine 
    FROM user_trading_engines 
    WHERE user_id = v_trade.user_id;
    
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_engine_type := v_global_engine;
    ELSE
      v_engine_type := v_user_engine;
    END IF;
    
    -- Calculate profit using database function
    v_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Update the trade's current_profit
    UPDATE trades 
    SET current_profit = v_profit, last_updated = now()
    WHERE id = v_trade.id;
  END LOOP;
END;
$$;

-- Create function to update live interest earned from active trades
CREATE OR REPLACE FUNCTION public.update_live_interest_earned()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- First sync all trade profits
  PERFORM public.sync_trading_profits();
  
  -- Update profiles with sum of current_profit from active trades
  UPDATE public.profiles p
  SET 
    interest_earned = COALESCE((
      SELECT SUM(GREATEST(t.current_profit, 0))
      FROM public.trades t
      WHERE t.user_id = p.id 
      AND t.status = 'active'
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
      SELECT SUM(GREATEST(t.current_profit, 0))
      FROM public.trades t
      WHERE t.user_id = p.id 
      AND t.status = 'active'
    ), 0)
  WHERE EXISTS (
    SELECT 1 FROM public.trades t 
    WHERE t.user_id = p.id 
    AND t.status = 'active'
  );
END;
$$;

-- Create the main stop_all_user_trades function
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_profit NUMERIC := 0;
  v_total_initial_amount NUMERIC := 0;
  v_trades_stopped INTEGER := 0;
  v_trade_details JSONB := '[]'::JSONB;
  v_trade RECORD;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_calculated_profit NUMERIC;
BEGIN
  -- Get global trading engine setting
  SELECT value::text INTO v_global_engine 
  FROM admin_settings 
  WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  -- Get user-specific engine
  SELECT engine_type::text INTO v_user_engine 
  FROM user_trading_engines 
  WHERE user_id = p_user_id;
  
  IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
    v_engine_type := v_global_engine;
  ELSE
    v_engine_type := v_user_engine;
  END IF;
  
  -- Loop through active trades and calculate final profits
  FOR v_trade IN 
    SELECT 
      t.id,
      t.initial_amount,
      t.trade_type,
      t.entry_price,
      t.current_price,
      t.started_at,
      t.asset_id,
      t.profit_multiplier,
      COALESCE(a.symbol, 'N/A') as asset_symbol,
      COALESCE(a.name, 'Unknown') as asset_name
    FROM trades t
    LEFT JOIN tradeable_assets a ON t.asset_id = a.id
    WHERE t.user_id = p_user_id AND t.status = 'active'
  LOOP
    -- Calculate profit using database function
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Update the trade with final profit and close it
    UPDATE trades 
    SET 
      current_profit = v_calculated_profit,
      status = 'stopped',
      last_updated = now()
    WHERE id = v_trade.id;
    
    -- Add trade details to array
    v_trade_details := v_trade_details || jsonb_build_object(
      'id', v_trade.id,
      'trade_type', v_trade.trade_type,
      'initial_amount', v_trade.initial_amount,
      'profit', v_calculated_profit,
      'entry_price', v_trade.entry_price,
      'exit_price', v_trade.current_price,
      'asset_symbol', v_trade.asset_symbol,
      'asset_name', v_trade.asset_name,
      'started_at', v_trade.started_at,
      'stopped_at', now()
    );
    
    -- Accumulate profits and amounts
    v_total_profit := v_total_profit + v_calculated_profit;
    v_total_initial_amount := v_total_initial_amount + COALESCE(v_trade.initial_amount, 0);
    v_trades_stopped := v_trades_stopped + 1;
  END LOOP;
  
  -- If no active trades, return early
  IF v_trades_stopped = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active trades to stop',
      'trades_stopped', 0,
      'total_profit', 0,
      'trade_details', '[]'::jsonb
    );
  END IF;
  
  -- Update user profile balances
  -- interest_earned gets the profit (positive only)
  -- net_balance = base_balance + interest_earned
  UPDATE profiles 
  SET 
    interest_earned = COALESCE(interest_earned, 0) + GREATEST(v_total_profit, 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE(interest_earned, 0) + GREATEST(v_total_profit, 0),
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Handle losses - subtract from net_balance if profit is negative
  IF v_total_profit < 0 THEN
    UPDATE profiles 
    SET 
      net_balance = GREATEST(COALESCE(net_balance, 0) + v_total_profit, 0),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trades stopped successfully',
    'trades_stopped', v_trades_stopped,
    'total_profit', ROUND(v_total_profit, 2),
    'total_initial_amount', v_total_initial_amount,
    'trade_details', v_trade_details
  );
END;
$$;