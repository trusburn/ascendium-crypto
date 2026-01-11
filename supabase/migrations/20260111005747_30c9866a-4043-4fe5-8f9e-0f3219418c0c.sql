-- Fix COALESCE type mismatch in start_trade_validated function
-- The engine_type column is trading_engine_type enum, but COALESCE tries to mix it with text values

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
  p_trading_pair text DEFAULT NULL::text, 
  p_market_type text DEFAULT NULL::text, 
  p_stop_loss numeric DEFAULT NULL::numeric, 
  p_take_profit numeric DEFAULT NULL::numeric, 
  p_duration_type text DEFAULT 'unlimited'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance_amount numeric;
  v_trade_id uuid;
  v_engine_type text;
  v_user_engine text;
  v_global_engine text;
  v_expires_at timestamp with time zone;
BEGIN
  -- Validate duration type
  IF p_duration_type IS NOT NULL AND p_duration_type NOT IN ('1h', '6h', '24h', '7d', 'unlimited') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid duration type');
  END IF;

  -- Calculate expiration time based on duration
  IF p_duration_type = '1h' THEN
    v_expires_at := now() + interval '1 hour';
  ELSIF p_duration_type = '6h' THEN
    v_expires_at := now() + interval '6 hours';
  ELSIF p_duration_type = '24h' THEN
    v_expires_at := now() + interval '24 hours';
  ELSIF p_duration_type = '7d' THEN
    v_expires_at := now() + interval '7 days';
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Validate amount
  IF p_initial_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trade amount');
  END IF;

  -- Get current balance for the selected source
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', p_balance_source)
  INTO v_balance_amount
  USING p_user_id;

  -- Check sufficient balance
  IF v_balance_amount < p_initial_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance in ' || p_balance_source);
  END IF;

  -- Get user's trading engine (cast enum to text to avoid COALESCE type mismatch)
  SELECT engine_type::text INTO v_user_engine 
  FROM user_trading_engines 
  WHERE user_id = p_user_id;
  
  -- Get global trading engine
  SELECT TRIM(BOTH '"' FROM value::text) INTO v_global_engine
  FROM admin_settings 
  WHERE key = 'global_trading_engine';
  
  -- Determine effective engine type
  IF v_user_engine IS NOT NULL AND v_user_engine != 'default' THEN
    v_engine_type := v_user_engine;
  ELSIF v_global_engine IS NOT NULL THEN
    v_engine_type := v_global_engine;
  ELSE
    v_engine_type := 'rising';
  END IF;

  -- For rising engine, signal is required
  IF v_engine_type = 'rising' AND (p_signal_id IS NULL OR p_signal_id = '00000000-0000-0000-0000-000000000000') THEN
    RETURN json_build_object('success', false, 'error', 'Signal required for Rising engine');
  END IF;

  -- For general engine, signal should NOT be used
  IF v_engine_type = 'general' AND p_signal_id IS NOT NULL AND p_signal_id != '00000000-0000-0000-0000-000000000000' THEN
    RETURN json_build_object('success', false, 'error', 'Signals not allowed in General engine');
  END IF;

  -- Deduct balance atomically
  EXECUTE format('UPDATE profiles SET %I = %I - $1, updated_at = now() WHERE id = $2', p_balance_source, p_balance_source)
  USING p_initial_amount, p_user_id;

  -- Create trade record
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
    trading_pair,
    market_type,
    stop_loss,
    take_profit,
    duration_type,
    expires_at,
    status
  ) VALUES (
    p_user_id,
    CASE WHEN v_engine_type = 'rising' THEN p_signal_id ELSE NULL END,
    CASE WHEN v_engine_type = 'rising' THEN p_purchased_signal_id ELSE NULL END,
    p_trade_type,
    p_trade_type,
    p_initial_amount,
    p_profit_multiplier,
    p_asset_id,
    p_entry_price,
    p_entry_price,
    p_trading_pair,
    p_market_type,
    p_stop_loss,
    p_take_profit,
    COALESCE(p_duration_type, 'unlimited'),
    v_expires_at,
    'active'
  )
  RETURNING id INTO v_trade_id;

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN json_build_object(
    'success', true, 
    'trade_id', v_trade_id,
    'engine', v_engine_type,
    'expires_at', v_expires_at
  );
END;
$function$;