-- Add new columns to trades table for proper trading pair and equity tracking
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trading_pair text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'crypto';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trade_direction text DEFAULT 'buy';

-- Update existing trades to have trade_direction based on trade_type
UPDATE public.trades SET trade_direction = trade_type WHERE trade_direction IS NULL;

-- Create or replace the calculate_trade_profit function with equity-based logic
CREATE OR REPLACE FUNCTION public.calculate_trade_profit(
  p_trade_id uuid,
  p_engine_type text DEFAULT 'rising'::text
)
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
    
    -- Slight downward bias for general market
    v_trend := -0.05 + (SIN(v_time_factor * 0.1) * 0.1);
    
    -- Calculate price change percentage
    v_price_change_pct := (v_sinusoidal + v_noise + v_trend) * v_volatility;
    
    -- Apply direction multiplier - BUY profits on positive change, SELL profits on negative
    v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
    
    -- Cap losses at initial amount (can't lose more than invested)
    v_profit := GREATEST(v_profit, -v_trade.initial_amount);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$function$;

-- Update start_trade_validated to include new fields
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
  p_market_type text DEFAULT 'crypto'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_engine text;
  v_global_engine text;
  v_effective_engine text;
  v_balance_deducted boolean;
  v_trade_id uuid;
BEGIN
  -- Validate amount
  IF p_initial_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trade amount must be greater than 0'
    );
  END IF;

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
  
  -- CRITICAL: Require signal for Rising engine
  IF v_effective_engine = 'rising' AND p_signal_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rising engine requires a signal to trade. Please select a purchased signal.'
    );
  END IF;
  
  -- Deduct balance from the selected source
  SELECT deduct_trade_from_balance(p_user_id, p_balance_source, p_initial_amount) INTO v_balance_deducted;
  
  IF NOT v_balance_deducted THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance in selected source'
    );
  END IF;
  
  -- Create the trade with new fields
  INSERT INTO trades (
    user_id,
    signal_id,
    purchased_signal_id,
    trade_type,
    trade_direction,
    initial_amount,
    profit_multiplier,
    asset_id,
    entry_price,
    current_price,
    current_profit,
    trading_pair,
    market_type,
    status
  ) VALUES (
    p_user_id,
    p_signal_id,
    p_purchased_signal_id,
    p_trade_type,
    p_trade_type,
    p_initial_amount,
    p_profit_multiplier,
    p_asset_id,
    p_entry_price,
    p_entry_price,
    0,
    p_trading_pair,
    COALESCE(p_market_type, 'crypto'),
    'active'
  ) RETURNING id INTO v_trade_id;
  
  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'engine', v_effective_engine
  );
END;
$function$;