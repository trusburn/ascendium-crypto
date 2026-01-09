-- Fix GENERAL engine profit calculation to use time-based simulation when price hasn't changed
-- The issue: when current_price == entry_price, profit = 0 instead of using simulation

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
    -- GENERAL engine: Real market-like fluctuations (CAN LOSE MONEY)
    -- ALWAYS use time-based simulation for consistent market movement
    -- This ensures profit fluctuates even when real price data isn't updating
    
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
    
    -- Slight overall bias (can be positive or negative depending on trade seed)
    v_trend := SIN(v_seed * 2.5) * 0.1 + (SIN(v_time_factor * 0.1) * 0.1);
    
    -- Calculate price change percentage (ranges roughly -80% to +80%)
    v_price_change_pct := (v_sinusoidal + v_noise + v_trend) * v_volatility;
    
    -- Apply direction multiplier - BUY profits on positive change, SELL profits on negative
    v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
    
    -- Cap losses at initial amount (can't lose more than invested)
    v_profit := GREATEST(v_profit, -v_trade.initial_amount);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$function$;