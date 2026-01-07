-- Fix recalculate_net_balance to include ALL balances (NO active trade equity - that's calculated on read)
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT 
    COALESCE(btc_balance, 0) + 
    COALESCE(eth_balance, 0) + 
    COALESCE(usdt_balance, 0) + 
    COALESCE(interest_earned, 0) + 
    COALESCE(commissions, 0)
  INTO v_total
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Update the net_balance
  UPDATE profiles 
  SET net_balance = v_total
  WHERE id = p_user_id;
  
  RETURN v_total;
END;
$$;

-- Create a function to stop a SINGLE trade
CREATE OR REPLACE FUNCTION public.stop_single_trade(p_user_id uuid, p_trade_id uuid)
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
  
  -- Get the trade
  SELECT 
    t.id,
    t.initial_amount,
    t.trade_type,
    t.entry_price,
    t.current_price,
    t.started_at,
    t.trading_pair,
    t.market_type,
    t.status,
    t.user_id
  INTO v_trade
  FROM trades t
  WHERE t.id = p_trade_id;
  
  -- Validate trade exists and belongs to user
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade not found'
    );
  END IF;
  
  IF v_trade.user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade does not belong to user'
    );
  END IF;
  
  IF v_trade.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade is not active'
    );
  END IF;
  
  -- Calculate profit using database function
  v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
  
  -- Ensure loss doesn't exceed initial amount
  v_final_profit := GREATEST(v_calculated_profit, -v_trade.initial_amount);
  
  -- Update the trade with final profit and close it
  UPDATE trades 
  SET 
    current_profit = v_final_profit,
    status = 'stopped',
    last_updated = now()
  WHERE id = v_trade.id;
  
  -- Update user profile balances
  -- CRITICAL: interest_earned NEVER goes negative
  -- Only add to interest_earned if profit is positive
  IF v_final_profit >= 0 THEN
    UPDATE profiles 
    SET 
      interest_earned = GREATEST(COALESCE(interest_earned, 0) + v_final_profit, 0),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Recalculate net balance (losses reduce the calculated net, not interest_earned)
  PERFORM recalculate_net_balance(p_user_id);
  
  -- If there was a loss, we need to deduct it from net_balance directly
  IF v_final_profit < 0 THEN
    UPDATE profiles 
    SET 
      net_balance = GREATEST(COALESCE(net_balance, 0) + v_final_profit, 0),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'initial_amount', v_trade.initial_amount,
    'profit', v_final_profit,
    'trading_pair', v_trade.trading_pair,
    'trade_type', v_trade.trade_type,
    'is_profit', v_final_profit >= 0
  );
END;
$$;

-- Fix stop_all_user_trades to properly handle interest_earned (never negative)
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      t.trading_pair,
      t.market_type,
      COALESCE(t.trading_pair, 'N/A') as asset_symbol
    FROM trades t
    WHERE t.user_id = p_user_id AND t.status = 'active'
  LOOP
    -- Calculate profit using database function
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Cap losses at initial amount
    v_calculated_profit := GREATEST(v_calculated_profit, -v_trade.initial_amount);
    
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
      'trading_pair', v_trade.trading_pair,
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
  
  -- CRITICAL: Only add POSITIVE profits to interest_earned
  -- interest_earned NEVER goes negative
  IF v_total_profit > 0 THEN
    UPDATE profiles 
    SET 
      interest_earned = GREATEST(COALESCE(interest_earned, 0) + v_total_profit, 0),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Recalculate net balance from all sources
  PERFORM recalculate_net_balance(p_user_id);
  
  -- If there were net losses, deduct from net_balance only
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

-- Create function to auto-liquidate losing trades (equity <= 0)
CREATE OR REPLACE FUNCTION public.check_and_liquidate_trades()
RETURNS void
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
BEGIN
  -- Loop through all active trades
  FOR v_trade IN 
    SELECT t.id, t.user_id, t.initial_amount
    FROM trades t
    WHERE t.status = 'active'
  LOOP
    -- Get engine for this user
    SELECT value::text INTO v_global_engine 
    FROM admin_settings 
    WHERE key = 'global_trading_engine';
    v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
    
    SELECT engine_type::text INTO v_user_engine 
    FROM user_trading_engines 
    WHERE user_id = v_trade.user_id;
    
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_engine_type := v_global_engine;
    ELSE
      v_engine_type := v_user_engine;
    END IF;
    
    -- Calculate current profit
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- If equity (initial + profit) <= 0, liquidate
    IF (v_trade.initial_amount + v_calculated_profit) <= 0 THEN
      -- Set profit to exactly -initial_amount (total loss)
      UPDATE trades 
      SET 
        current_profit = -v_trade.initial_amount,
        status = 'liquidated',
        last_updated = now()
      WHERE id = v_trade.id;
      
      -- Recalculate user's net balance
      PERFORM recalculate_net_balance(v_trade.user_id);
    ELSE
      -- Just update current profit
      UPDATE trades 
      SET 
        current_profit = v_calculated_profit,
        last_updated = now()
      WHERE id = v_trade.id;
    END IF;
  END LOOP;
END;
$$;

-- Update sync_trading_profits to also check for liquidations
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_calculated_profit NUMERIC;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
BEGIN
  -- Loop through all active trades
  FOR v_trade IN 
    SELECT t.id, t.user_id, t.initial_amount
    FROM trades t
    WHERE t.status = 'active'
  LOOP
    -- Get engine for this user
    SELECT value::text INTO v_global_engine 
    FROM admin_settings 
    WHERE key = 'global_trading_engine';
    v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
    
    SELECT engine_type::text INTO v_user_engine 
    FROM user_trading_engines 
    WHERE user_id = v_trade.user_id;
    
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_engine_type := v_global_engine;
    ELSE
      v_engine_type := v_user_engine;
    END IF;
    
    -- Calculate profit
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Check for liquidation (equity <= 0)
    IF (v_trade.initial_amount + v_calculated_profit) <= 0 THEN
      -- Liquidate trade - total loss
      UPDATE trades 
      SET 
        current_profit = -v_trade.initial_amount,
        status = 'liquidated',
        last_updated = now()
      WHERE id = v_trade.id;
      
      -- Recalculate net balance (loss is already counted as lost investment)
      PERFORM recalculate_net_balance(v_trade.user_id);
    ELSE
      -- Just update the profit
      UPDATE trades 
      SET 
        current_profit = v_calculated_profit,
        last_updated = now()
      WHERE id = v_trade.id;
    END IF;
  END LOOP;
END;
$$;

-- Ensure interest_earned is never negative (protection constraint)
DO $$
BEGIN
  -- Update any existing negative interest_earned to 0
  UPDATE profiles 
  SET interest_earned = 0 
  WHERE interest_earned < 0;
END $$;