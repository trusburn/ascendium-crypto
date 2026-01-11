-- Add trading enhancement columns to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS stop_loss numeric NULL,
ADD COLUMN IF NOT EXISTS take_profit numeric NULL,
ADD COLUMN IF NOT EXISTS duration_type text NULL CHECK (duration_type IN ('1h', '6h', '24h', '7d', 'unlimited')),
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.trades.stop_loss IS 'Stop loss price - auto-close trade if price falls to this level';
COMMENT ON COLUMN public.trades.take_profit IS 'Take profit price - auto-close trade if price reaches this level';
COMMENT ON COLUMN public.trades.duration_type IS 'Trade duration: 1h, 6h, 24h, 7d, or unlimited';
COMMENT ON COLUMN public.trades.expires_at IS 'When the trade will auto-close based on duration';

-- Create function to check and auto-close expired trades
CREATE OR REPLACE FUNCTION public.check_trade_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_trade RECORD;
  v_final_profit numeric;
BEGIN
  -- Loop through all expired active trades
  FOR expired_trade IN 
    SELECT * FROM trades 
    WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at <= now()
  LOOP
    -- Calculate final profit
    v_final_profit := expired_trade.current_profit;
    
    -- Update trade status
    UPDATE trades 
    SET status = 'stopped',
        last_updated = now()
    WHERE id = expired_trade.id;
    
    -- Add profit to interest_earned if positive
    IF v_final_profit > 0 THEN
      UPDATE profiles 
      SET interest_earned = COALESCE(interest_earned, 0) + v_final_profit,
          updated_at = now()
      WHERE id = expired_trade.user_id;
    END IF;
    
    -- Recalculate net balance
    PERFORM recalculate_net_balance(expired_trade.user_id);
    
    -- Create transaction record
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      expired_trade.user_id,
      CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
      ABS(v_final_profit),
      'Trade expired: ' || COALESCE(expired_trade.trading_pair, 'Unknown') || ' (' || expired_trade.duration_type || ')'
    );
  END LOOP;
END;
$$;

-- Create function to check stop loss and take profit triggers
CREATE OR REPLACE FUNCTION public.check_sl_tp_triggers()
RETURNS void
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
BEGIN
  -- Loop through all active trades with SL/TP set
  FOR trade_rec IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active' 
    AND (t.stop_loss IS NOT NULL OR t.take_profit IS NOT NULL)
  LOOP
    v_current_price := COALESCE(trade_rec.asset_current_price, trade_rec.current_price, trade_rec.entry_price);
    v_should_close := false;
    v_close_reason := '';
    
    -- Check stop loss (for BUY: close if price drops below SL, for SELL: close if price rises above SL)
    IF trade_rec.stop_loss IS NOT NULL THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price <= trade_rec.stop_loss THEN
        v_should_close := true;
        v_close_reason := 'Stop Loss triggered';
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price >= trade_rec.stop_loss THEN
        v_should_close := true;
        v_close_reason := 'Stop Loss triggered';
      END IF;
    END IF;
    
    -- Check take profit (for BUY: close if price rises above TP, for SELL: close if price drops below TP)
    IF trade_rec.take_profit IS NOT NULL AND NOT v_should_close THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price >= trade_rec.take_profit THEN
        v_should_close := true;
        v_close_reason := 'Take Profit triggered';
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price <= trade_rec.take_profit THEN
        v_should_close := true;
        v_close_reason := 'Take Profit triggered';
      END IF;
    END IF;
    
    -- Close the trade if triggered
    IF v_should_close THEN
      v_final_profit := trade_rec.current_profit;
      
      -- Update trade status
      UPDATE trades 
      SET status = 'stopped',
          last_updated = now()
      WHERE id = trade_rec.id;
      
      -- Add profit to interest_earned if positive
      IF v_final_profit > 0 THEN
        UPDATE profiles 
        SET interest_earned = COALESCE(interest_earned, 0) + v_final_profit,
            updated_at = now()
        WHERE id = trade_rec.user_id;
      END IF;
      
      -- Recalculate net balance
      PERFORM recalculate_net_balance(trade_rec.user_id);
      
      -- Create transaction record
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        trade_rec.user_id,
        CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
        ABS(v_final_profit),
        v_close_reason || ': ' || COALESCE(trade_rec.trading_pair, 'Unknown') || 
        ' @ $' || v_current_price::text
      );
    END IF;
  END LOOP;
END;
$$;

-- Update the start_trade_validated function to accept new parameters
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
  p_market_type text DEFAULT NULL,
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
  v_balance_amount numeric;
  v_trade_id uuid;
  v_engine_type text;
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

  -- Get user's trading engine
  SELECT COALESCE(
    (SELECT engine_type FROM user_trading_engines WHERE user_id = p_user_id),
    (SELECT value::text FROM admin_settings WHERE key = 'global_trading_engine'),
    'rising'
  ) INTO v_engine_type;
  
  -- Remove quotes if present
  v_engine_type := REPLACE(REPLACE(v_engine_type, '"', ''), '''', '');

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
    p_trade_type, -- trade_direction same as trade_type (buy/sell)
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
$$;