-- 1. Fix recalculate_net_balance to include active trade equity
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_static_balance numeric;
  v_active_trade_equity numeric;
  v_total numeric;
BEGIN
  -- Calculate static balances (all crypto + interest + commissions)
  SELECT 
    COALESCE(btc_balance, 0) + 
    COALESCE(eth_balance, 0) + 
    COALESCE(usdt_balance, 0) + 
    COALESCE(interest_earned, 0) + 
    COALESCE(commissions, 0)
  INTO v_static_balance
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Calculate active trade equity (initial_amount + current_profit)
  SELECT COALESCE(SUM(initial_amount + COALESCE(current_profit, 0)), 0)
  INTO v_active_trade_equity
  FROM trades
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Total net balance = static balances + active trade equity
  v_total := COALESCE(v_static_balance, 0) + v_active_trade_equity;
  
  -- Update the net_balance
  UPDATE profiles 
  SET net_balance = v_total,
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN v_total;
END;
$function$;

-- 2. Enhanced stop_single_trade with transaction logging
CREATE OR REPLACE FUNCTION public.stop_single_trade(p_user_id uuid, p_trade_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Get the trade with validation
  SELECT 
    t.id,
    t.initial_amount,
    t.trade_type,
    t.trade_direction,
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
  
  -- Validation: Trade exists
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade not found'
    );
  END IF;
  
  -- Validation: Trade belongs to user
  IF v_trade.user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade does not belong to user'
    );
  END IF;
  
  -- Validation: Trade is active
  IF v_trade.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade is not active'
    );
  END IF;
  
  -- Calculate profit using database function with selected engine
  v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
  
  -- Cap losses at initial amount (can't lose more than invested)
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
  IF v_final_profit > 0 THEN
    UPDATE profiles 
    SET 
      interest_earned = GREATEST(COALESCE(interest_earned, 0) + v_final_profit, 0),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id,
    CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
    v_final_profit,
    COALESCE(v_trade.trade_type, 'buy') || ' ' || 
    COALESCE(v_trade.trading_pair, 'Unknown') || 
    ' | Invested: $' || v_trade.initial_amount::text || 
    ' | ' || CASE WHEN v_final_profit >= 0 THEN 'Profit' ELSE 'Loss' END || 
    ': $' || ABS(v_final_profit)::text
  );
  
  -- Recalculate net balance (this now includes active trade equity)
  PERFORM recalculate_net_balance(p_user_id);
  
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
$function$;

-- 3. Enhanced sync_trading_profits with proper liquidation
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trade RECORD;
  v_calculated_profit NUMERIC;
  v_engine_type TEXT;
  v_user_engine TEXT;
  v_global_engine TEXT;
  v_affected_users UUID[];
BEGIN
  v_affected_users := ARRAY[]::UUID[];
  
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
      
      -- Create liquidation transaction record
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        v_trade.user_id,
        'trade_liquidation',
        -v_trade.initial_amount,
        'Trade liquidated - Total loss: $' || v_trade.initial_amount::text
      );
    ELSE
      -- Just update the profit
      UPDATE trades 
      SET 
        current_profit = v_calculated_profit,
        last_updated = now()
      WHERE id = v_trade.id;
    END IF;
    
    -- Track affected users for balance recalculation
    IF NOT v_trade.user_id = ANY(v_affected_users) THEN
      v_affected_users := array_append(v_affected_users, v_trade.user_id);
    END IF;
  END LOOP;
  
  -- Recalculate net balance for all affected users
  FOR i IN 1..array_length(v_affected_users, 1) LOOP
    IF v_affected_users[i] IS NOT NULL THEN
      PERFORM recalculate_net_balance(v_affected_users[i]);
    END IF;
  END LOOP;
END;
$function$;

-- 4. Enhanced calculate_trade_profit (already supports GENERAL vs RISING modes)
-- This version ensures proper profit calculation for both modes
CREATE OR REPLACE FUNCTION public.calculate_trade_profit(p_trade_id uuid, p_engine_type text DEFAULT 'rising'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trade RECORD;
  v_seconds_elapsed NUMERIC;
  v_hours_elapsed NUMERIC;
  v_days_elapsed NUMERIC;
  v_profit NUMERIC;
  v_time_factor NUMERIC;
  v_sinusoidal NUMERIC;
  v_volatility NUMERIC;
  v_noise NUMERIC;
  v_trend NUMERIC;
  v_seed NUMERIC;
  v_price_change_pct NUMERIC;
  v_direction_multiplier NUMERIC;
BEGIN
  -- Get trade details
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate time elapsed
  v_seconds_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at));
  v_hours_elapsed := v_seconds_elapsed / 3600;
  v_days_elapsed := v_hours_elapsed / 24;
  
  -- Direction multiplier: BUY profits when price goes up, SELL profits when price goes down
  v_direction_multiplier := CASE WHEN COALESCE(v_trade.trade_direction, v_trade.trade_type) = 'buy' THEN 1 ELSE -1 END;
  
  IF p_engine_type = 'rising' THEN
    -- Rising engine: Always positive growth (guaranteed profit)
    -- Linear growth over time based on multiplier
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed;
    -- Ensure never negative
    v_profit := GREATEST(v_profit, 0);
  ELSE
    -- General engine: Real market-like fluctuations (CAN LOSE MONEY)
    -- If we have current_price from Twelve Data, use it for real calculation
    IF v_trade.current_price IS NOT NULL AND v_trade.entry_price IS NOT NULL AND v_trade.entry_price > 0 THEN
      -- Real market calculation based on price change
      v_price_change_pct := ((v_trade.current_price - v_trade.entry_price) / v_trade.entry_price);
      v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
    ELSE
      -- Fallback: Uses sinusoidal waves + noise to create realistic market movement
      
      -- Create a deterministic seed from trade ID for consistent noise pattern
      v_seed := ASCII(SUBSTRING(v_trade.id::text, 1, 1)) + 
                ASCII(SUBSTRING(v_trade.id::text, 3, 1)) * 0.1;
      
      -- Time factor for wave calculation (creates ~30 minute cycles)
      v_time_factor := v_seconds_elapsed / 1800;
      
      -- Primary sinusoidal wave (main market trend)
      v_sinusoidal := SIN(v_time_factor + v_seed) * 0.4;
      
      -- Secondary wave for complexity (faster oscillation)
      v_sinusoidal := v_sinusoidal + SIN(v_time_factor * 2.7 + v_seed * 1.5) * 0.25;
      
      -- Third wave for micro-movements
      v_sinusoidal := v_sinusoidal + SIN(v_time_factor * 7.3 + v_seed * 0.8) * 0.15;
      
      -- Volatility factor (varies between 0.3 and 1.0)
      v_volatility := 0.65 + SIN(v_time_factor * 0.3 + v_seed) * 0.35;
      
      -- Random-like noise based on time (deterministic but appears random)
      v_noise := SIN(v_seconds_elapsed * 0.017 + v_seed * 3.14) * 0.2;
      
      -- Slight downward bias for general market
      v_trend := -0.05 + (SIN(v_time_factor * 0.1) * 0.1);
      
      -- Calculate price change percentage
      v_price_change_pct := (v_sinusoidal + v_noise + v_trend) * v_volatility;
      
      -- Apply direction multiplier - BUY profits on positive change, SELL profits on negative
      v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
    END IF;
    
    -- Cap losses at initial amount (can't lose more than invested)
    v_profit := GREATEST(v_profit, -v_trade.initial_amount);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$function$;