-- Fix trades table to allow NULL signal_id for General engine trades

-- Make signal_id and purchased_signal_id nullable
ALTER TABLE public.trades 
ALTER COLUMN signal_id DROP NOT NULL;

ALTER TABLE public.trades 
ALTER COLUMN purchased_signal_id DROP NOT NULL;

-- Update the start_trade_validated function to handle null signals properly
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
  
  -- CRITICAL: Require signal for Rising engine
  IF v_effective_engine = 'rising' AND p_signal_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Signal is required for Rising engine trades.'
    );
  END IF;
  
  -- Validate amount
  IF p_initial_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trade amount must be greater than 0'
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
  
  -- Create the trade (signal_id can be NULL for General engine)
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
    p_signal_id,  -- NULL for General engine
    p_purchased_signal_id,  -- NULL for General engine
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