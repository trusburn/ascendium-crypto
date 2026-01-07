-- =====================================================
-- FIX: Trading Engine Logic - General Engine Must Fluctuate
-- =====================================================

-- 1. Update calculate_trade_profit to properly implement General engine with losses
CREATE OR REPLACE FUNCTION public.calculate_trade_profit(p_trade_id uuid, p_engine_type text DEFAULT 'rising'::text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  IF p_engine_type = 'rising' THEN
    -- Rising engine: Always positive growth (guaranteed profit)
    -- Linear growth over time based on multiplier
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed;
    -- Ensure never negative
    v_profit := GREATEST(v_profit, 0);
  ELSE
    -- General engine: Real market-like fluctuations (CAN LOSE MONEY)
    -- Uses sinusoidal waves + noise to create realistic market movement
    
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
    
    -- Slight downward bias for general market (-0.1 to account for fees/spread in real markets)
    v_trend := -0.05 + (SIN(v_time_factor * 0.1) * 0.1);
    
    -- Calculate final profit/loss
    -- The multiplied result can be positive OR negative
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed * 
                (v_sinusoidal + v_noise + v_trend) * v_volatility;
    
    -- Cap losses at initial amount (can't lose more than invested)
    v_profit := GREATEST(v_profit, -v_trade.initial_amount);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$$;

-- 2. Create a function to start trades with engine validation
CREATE OR REPLACE FUNCTION public.start_trade_validated(
  p_user_id uuid,
  p_signal_id uuid,
  p_purchased_signal_id uuid,
  p_trade_type text,
  p_initial_amount numeric,
  p_profit_multiplier numeric,
  p_asset_id uuid,
  p_entry_price numeric,
  p_balance_source text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_engine text;
  v_global_engine text;
  v_effective_engine text;
  v_balance_deducted boolean;
  v_trade_id uuid;
BEGIN
  -- Get user's engine setting
  SELECT engine_type::text INTO v_user_engine
  FROM user_trading_engines
  WHERE user_id = p_user_id;
  
  -- Get global engine setting
  SELECT value::text INTO v_global_engine
  FROM admin_settings
  WHERE key = 'global_trading_engine';
  
  -- Remove quotes if present (JSON text value)
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  -- Determine effective engine
  IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
    v_effective_engine := v_global_engine;
  ELSE
    v_effective_engine := v_user_engine;
  END IF;
  
  -- CRITICAL: Block signal usage on General engine
  IF v_effective_engine = 'general' AND p_signal_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Signal-based trading is not allowed on General engine. Signals are only available for Rising engine users.'
    );
  END IF;
  
  -- Deduct from selected balance
  SELECT public.deduct_trade_from_balance(p_user_id, p_initial_amount, p_balance_source)
  INTO v_balance_deducted;
  
  IF NOT v_balance_deducted THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance in selected source'
    );
  END IF;
  
  -- Create the trade
  INSERT INTO trades (
    user_id,
    signal_id,
    purchased_signal_id,
    trade_type,
    initial_amount,
    profit_multiplier,
    asset_id,
    entry_price,
    current_price,
    status
  ) VALUES (
    p_user_id,
    p_signal_id,
    p_purchased_signal_id,
    p_trade_type,
    p_initial_amount,
    p_profit_multiplier,
    p_asset_id,
    p_entry_price,
    p_entry_price,
    'active'
  )
  RETURNING id INTO v_trade_id;
  
  -- Sync trading profits
  PERFORM public.sync_trading_profits();
  
  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'engine', v_effective_engine
  );
END;
$$;

-- 3. Update update_live_interest_earned to use engine-aware profit calculation
CREATE OR REPLACE FUNCTION public.update_live_interest_earned()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_record RECORD;
  v_trade RECORD;
  v_total_profit NUMERIC;
  v_user_engine text;
  v_global_engine text;
  v_effective_engine text;
BEGIN
  -- Get global engine setting once
  SELECT COALESCE(TRIM(BOTH '"' FROM value::text), 'rising') INTO v_global_engine
  FROM admin_settings
  WHERE key = 'global_trading_engine';
  
  v_global_engine := COALESCE(v_global_engine, 'rising');
  
  -- Loop through all users with active trades
  FOR v_user_record IN 
    SELECT DISTINCT user_id FROM trades WHERE status = 'active'
  LOOP
    -- Get user's engine setting
    SELECT engine_type::text INTO v_user_engine
    FROM user_trading_engines
    WHERE user_id = v_user_record.user_id;
    
    -- Determine effective engine for this user
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_effective_engine := v_global_engine;
    ELSE
      v_effective_engine := v_user_engine;
    END IF;
    
    v_total_profit := 0;
    
    -- Calculate profit for each active trade using the correct engine
    FOR v_trade IN 
      SELECT id FROM trades 
      WHERE user_id = v_user_record.user_id AND status = 'active'
    LOOP
      v_total_profit := v_total_profit + public.calculate_trade_profit(v_trade.id, v_effective_engine);
    END LOOP;
    
    -- Update each trade's current_profit
    FOR v_trade IN 
      SELECT id FROM trades 
      WHERE user_id = v_user_record.user_id AND status = 'active'
    LOOP
      UPDATE trades 
      SET current_profit = public.calculate_trade_profit(v_trade.id, v_effective_engine),
          last_updated = now()
      WHERE id = v_trade.id;
    END LOOP;
    
    -- Update user's interest_earned with total profit (can be negative for general engine)
    UPDATE profiles 
    SET interest_earned = v_total_profit,
        updated_at = now()
    WHERE id = v_user_record.user_id;
    
    -- Recalculate net balance
    PERFORM public.recalculate_net_balance(v_user_record.user_id);
  END LOOP;
END;
$$;

-- 4. Update sync_trading_profits to be engine-aware
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade RECORD;
  v_user_engine text;
  v_global_engine text;
  v_effective_engine text;
BEGIN
  -- Get global engine setting
  SELECT COALESCE(TRIM(BOTH '"' FROM value::text), 'rising') INTO v_global_engine
  FROM admin_settings
  WHERE key = 'global_trading_engine';
  
  v_global_engine := COALESCE(v_global_engine, 'rising');
  
  -- Update each active trade
  FOR v_trade IN 
    SELECT t.id, t.user_id FROM trades t WHERE t.status = 'active'
  LOOP
    -- Get user's engine setting
    SELECT engine_type::text INTO v_user_engine
    FROM user_trading_engines
    WHERE user_id = v_trade.user_id;
    
    -- Determine effective engine
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_effective_engine := v_global_engine;
    ELSE
      v_effective_engine := v_user_engine;
    END IF;
    
    -- Update the trade's current profit
    UPDATE trades 
    SET current_profit = public.calculate_trade_profit(v_trade.id, v_effective_engine),
        last_updated = now()
    WHERE id = v_trade.id;
  END LOOP;
END;
$$;