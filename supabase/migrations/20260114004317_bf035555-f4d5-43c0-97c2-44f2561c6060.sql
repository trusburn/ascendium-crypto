-- Fix calculate_trade_profit to use REAL price delta like MT5
-- P/L = (current_price - entry_price) × direction × (initial_amount / entry_price)

CREATE OR REPLACE FUNCTION public.calculate_trade_profit(
  p_trade_id uuid,
  p_engine_type text DEFAULT 'general'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_asset_price NUMERIC;
  v_profit NUMERIC;
  v_price_delta NUMERIC;
  v_direction_multiplier NUMERIC;
  v_position_size NUMERIC;
  v_seconds_elapsed NUMERIC;
  v_days_elapsed NUMERIC;
BEGIN
  -- Get trade details with asset price
  SELECT t.*, ta.current_price as live_asset_price
  INTO v_trade 
  FROM trades t
  LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
  WHERE t.id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Use the best available current price
  v_asset_price := COALESCE(
    v_trade.live_asset_price,
    v_trade.current_price,
    v_trade.entry_price
  );
  
  -- If no valid entry price, return 0 (legacy trades without prices)
  IF v_trade.entry_price IS NULL OR v_trade.entry_price <= 0 THEN
    -- For legacy trades without entry_price, use time-based calculation
    v_seconds_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at));
    v_days_elapsed := v_seconds_elapsed / 86400;
    
    IF p_engine_type = 'rising' THEN
      v_profit := v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed;
      RETURN ROUND(GREATEST(v_profit, 0), 2);
    ELSE
      -- General engine: sinusoidal simulation for legacy trades
      v_profit := v_trade.initial_amount * SIN(v_seconds_elapsed / 1800) * 0.3;
      RETURN ROUND(GREATEST(v_profit, -v_trade.initial_amount), 2);
    END IF;
  END IF;
  
  -- MT5-STYLE REAL MARKET CALCULATION
  -- Direction: BUY profits when price goes UP, SELL profits when price goes DOWN
  v_direction_multiplier := CASE 
    WHEN COALESCE(v_trade.trade_direction, v_trade.trade_type) = 'buy' THEN 1 
    ELSE -1 
  END;
  
  -- Calculate price delta (current - entry)
  v_price_delta := v_asset_price - v_trade.entry_price;
  
  -- Position size in base asset units (how many units we bought/sold)
  -- e.g., $100 at entry price $50,000 = 0.002 BTC
  v_position_size := v_trade.initial_amount / v_trade.entry_price;
  
  IF p_engine_type = 'rising' THEN
    -- RISING ENGINE: Always positive bias
    -- Use the profit multiplier to simulate guaranteed growth
    v_seconds_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at));
    v_days_elapsed := v_seconds_elapsed / 86400;
    
    -- Base profit from price movement (if positive)
    v_profit := GREATEST(v_price_delta * v_position_size * v_direction_multiplier, 0);
    
    -- Add guaranteed time-based growth on top
    v_profit := v_profit + (v_trade.initial_amount * v_trade.profit_multiplier * v_days_elapsed);
    
    -- Rising engine: Never goes negative
    v_profit := GREATEST(v_profit, 0);
  ELSE
    -- GENERAL ENGINE: Real market P/L (MT5-style)
    -- P/L = (current_price - entry_price) × position_size × direction
    -- This can be positive or negative based on actual price movement
    
    v_profit := v_price_delta * v_position_size * v_direction_multiplier;
    
    -- Cap losses at initial investment (can't lose more than margin)
    v_profit := GREATEST(v_profit, -v_trade.initial_amount);
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$$;

-- Fix sync_trading_profits to properly update current_price and profit
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
  v_affected_users UUID[];
  v_asset_price NUMERIC;
  v_price_change_pct NUMERIC;
BEGIN
  v_affected_users := ARRAY[]::UUID[];
  
  -- Get global engine once
  SELECT COALESCE(TRIM(BOTH '"' FROM value::text), 'rising') INTO v_global_engine
  FROM admin_settings
  WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(v_global_engine, 'rising');
  
  -- Loop through all active trades
  FOR v_trade IN 
    SELECT t.id, t.user_id, t.initial_amount, t.asset_id, t.entry_price
    FROM trades t
    WHERE t.status = 'active'
  LOOP
    -- CRITICAL: Sync current_price from tradeable_assets to trades
    IF v_trade.asset_id IS NOT NULL THEN
      SELECT current_price INTO v_asset_price
      FROM tradeable_assets
      WHERE id = v_trade.asset_id;
      
      IF v_asset_price IS NOT NULL AND v_trade.entry_price IS NOT NULL AND v_trade.entry_price > 0 THEN
        v_price_change_pct := ((v_asset_price - v_trade.entry_price) / v_trade.entry_price) * 100;
        
        -- Update trade with live price
        UPDATE trades 
        SET current_price = v_asset_price,
            price_change_percent = v_price_change_pct,
            last_updated = now()
        WHERE id = v_trade.id;
      END IF;
    END IF;
    
    -- Get engine for this user
    SELECT engine_type::text INTO v_user_engine 
    FROM user_trading_engines 
    WHERE user_id = v_trade.user_id;
    
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_engine_type := v_global_engine;
    ELSE
      v_engine_type := v_user_engine;
    END IF;
    
    -- Calculate profit using the real market engine
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Check for liquidation (equity <= 0)
    IF (v_trade.initial_amount + v_calculated_profit) <= 0 THEN
      -- Liquidate trade - total loss capped at initial amount
      UPDATE trades 
      SET 
        current_profit = -v_trade.initial_amount,
        status = 'liquidated',
        last_updated = now()
      WHERE id = v_trade.id;
      
      -- Release margin and apply loss
      PERFORM release_margin_and_apply_pnl(v_trade.user_id, v_trade.initial_amount, -v_trade.initial_amount, 'usdt_balance');
      
      -- Create liquidation transaction record
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        v_trade.user_id,
        'trade_liquidation',
        v_trade.initial_amount,
        'Trade liquidated - Total loss: $' || v_trade.initial_amount::text
      );
    ELSE
      -- Update the trade profit (unrealized P/L stays in trade)
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
  FOR i IN 1..COALESCE(array_length(v_affected_users, 1), 0) LOOP
    IF v_affected_users[i] IS NOT NULL THEN
      PERFORM recalculate_net_balance(v_affected_users[i]);
    END IF;
  END LOOP;
END;
$$;

-- Fix check_sl_tp_triggers to use actual price delta for SL/TP checks
CREATE OR REPLACE FUNCTION public.check_sl_tp_triggers()
RETURNS json
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
  v_triggered_count integer := 0;
  v_exit_price numeric;
BEGIN
  FOR trade_rec IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t 
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active' 
    AND (t.stop_loss IS NOT NULL OR t.take_profit IS NOT NULL)
  LOOP
    -- Get the most accurate current price
    v_current_price := COALESCE(
      trade_rec.asset_current_price, 
      trade_rec.current_price, 
      trade_rec.entry_price
    );
    v_should_close := false;
    v_close_reason := '';
    v_exit_price := v_current_price;
    
    -- Check stop loss
    IF trade_rec.stop_loss IS NOT NULL THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price <= trade_rec.stop_loss THEN
        v_should_close := true;
        v_exit_price := trade_rec.stop_loss; -- Use SL price as exit
        v_close_reason := 'Stop Loss hit at $' || trade_rec.stop_loss::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price >= trade_rec.stop_loss THEN
        v_should_close := true;
        v_exit_price := trade_rec.stop_loss;
        v_close_reason := 'Stop Loss hit at $' || trade_rec.stop_loss::text;
      END IF;
    END IF;
    
    -- Check take profit
    IF trade_rec.take_profit IS NOT NULL AND NOT v_should_close THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price >= trade_rec.take_profit THEN
        v_should_close := true;
        v_exit_price := trade_rec.take_profit; -- Use TP price as exit
        v_close_reason := 'Take Profit hit at $' || trade_rec.take_profit::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price <= trade_rec.take_profit THEN
        v_should_close := true;
        v_exit_price := trade_rec.take_profit;
        v_close_reason := 'Take Profit hit at $' || trade_rec.take_profit::text;
      END IF;
    END IF;
    
    IF v_should_close THEN
      -- Calculate EXACT P/L based on entry vs exit price
      IF trade_rec.entry_price IS NOT NULL AND trade_rec.entry_price > 0 THEN
        -- MT5 formula: P/L = (exit - entry) × position_size × direction
        v_final_profit := (v_exit_price - trade_rec.entry_price) 
                         * (trade_rec.initial_amount / trade_rec.entry_price)
                         * CASE WHEN trade_rec.trade_direction = 'buy' THEN 1 ELSE -1 END;
        v_final_profit := ROUND(GREATEST(v_final_profit, -trade_rec.initial_amount), 2);
      ELSE
        -- Legacy trade: use current_profit
        v_final_profit := COALESCE(trade_rec.current_profit, 0);
      END IF;
      
      v_triggered_count := v_triggered_count + 1;
      
      -- Update trade: set final profit, exit price, and status
      UPDATE trades 
      SET status = 'stopped', 
          current_profit = v_final_profit,
          current_price = v_exit_price,
          last_updated = now() 
      WHERE id = trade_rec.id;
      
      -- MT5: Release margin and apply P/L to balance
      PERFORM release_margin_and_apply_pnl(trade_rec.user_id, trade_rec.initial_amount, v_final_profit, 'usdt_balance');
      
      -- Record transaction with exact P/L
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        trade_rec.user_id, 
        CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
        ABS(v_final_profit), 
        v_close_reason || ' | ' || COALESCE(trade_rec.trading_pair, 'Unknown') || 
        ' | Entry: $' || COALESCE(trade_rec.entry_price::text, '0') || 
        ' | Exit: $' || v_exit_price::text ||
        ' | P/L: ' || CASE WHEN v_final_profit >= 0 THEN '+' ELSE '' END || '$' || v_final_profit::text
      );
    END IF;
  END LOOP;
  
  RETURN json_build_object('triggered_count', v_triggered_count);
END;
$$;

-- Fix stop_single_trade to use real price-based P/L
CREATE OR REPLACE FUNCTION public.stop_single_trade(
  p_trade_id uuid,
  p_user_id uuid
)
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
  v_final_profit NUMERIC;
  v_exit_price NUMERIC;
  v_asset_price NUMERIC;
BEGIN
  -- Get global engine
  SELECT value::text INTO v_global_engine FROM admin_settings WHERE key = 'global_trading_engine';
  v_global_engine := COALESCE(TRIM(BOTH '"' FROM v_global_engine), 'rising');
  
  -- Get user engine
  SELECT engine_type::text INTO v_user_engine FROM user_trading_engines WHERE user_id = p_user_id;
  v_engine_type := COALESCE(NULLIF(v_user_engine, 'default'), v_global_engine);
  
  -- Get trade with current asset price
  SELECT t.*, ta.current_price as live_asset_price
  INTO v_trade 
  FROM trades t
  LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
  WHERE t.id = p_trade_id;
  
  IF v_trade IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found'); 
  END IF;
  IF v_trade.user_id != p_user_id THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade does not belong to user'); 
  END IF;
  IF v_trade.status != 'active' THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Trade is not active'); 
  END IF;
  
  -- Get exit price (latest asset price)
  v_exit_price := COALESCE(v_trade.live_asset_price, v_trade.current_price, v_trade.entry_price);
  
  -- Calculate final P/L based on actual price movement
  IF v_trade.entry_price IS NOT NULL AND v_trade.entry_price > 0 AND v_exit_price IS NOT NULL THEN
    -- MT5 formula: P/L = (exit - entry) × position_size × direction
    v_final_profit := (v_exit_price - v_trade.entry_price) 
                     * (v_trade.initial_amount / v_trade.entry_price)
                     * CASE WHEN COALESCE(v_trade.trade_direction, v_trade.trade_type) = 'buy' THEN 1 ELSE -1 END;
    
    -- For rising engine, ensure non-negative
    IF v_engine_type = 'rising' THEN
      v_final_profit := GREATEST(v_final_profit, 0);
    END IF;
    
    -- Cap losses at initial amount
    v_final_profit := GREATEST(v_final_profit, -v_trade.initial_amount);
  ELSE
    -- Legacy trade or missing prices: use calculated profit
    v_final_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    v_final_profit := GREATEST(v_final_profit, -v_trade.initial_amount);
  END IF;
  
  v_final_profit := ROUND(v_final_profit, 2);
  
  -- Update trade with final state
  UPDATE trades 
  SET current_profit = v_final_profit, 
      current_price = v_exit_price,
      status = 'stopped', 
      last_updated = now() 
  WHERE id = v_trade.id;
  
  -- MT5: Release margin and apply P/L to balance
  PERFORM release_margin_and_apply_pnl(p_user_id, v_trade.initial_amount, v_final_profit, 'usdt_balance');
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 
    CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END, 
    ABS(v_final_profit),
    COALESCE(v_trade.trade_direction, v_trade.trade_type, 'buy') || ' ' || COALESCE(v_trade.trading_pair, 'Unknown') || 
    ' | Entry: $' || COALESCE(v_trade.entry_price::text, '0') || 
    ' | Exit: $' || COALESCE(v_exit_price::text, '0') ||
    ' | Margin: $' || v_trade.initial_amount::text || 
    ' | P/L: ' || CASE WHEN v_final_profit >= 0 THEN '+' ELSE '' END || '$' || v_final_profit::text
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'trade_id', v_trade.id, 
    'entry_price', v_trade.entry_price,
    'exit_price', v_exit_price,
    'initial_amount', v_trade.initial_amount, 
    'final_profit', v_final_profit, 
    'margin_released', v_trade.initial_amount
  );
END;
$$;

-- Add comment explaining the MT5 model
COMMENT ON FUNCTION public.calculate_trade_profit IS 'MT5-style P/L calculation: P/L = (current_price - entry_price) × position_size × direction. Position size = initial_amount / entry_price. Rising engine adds guaranteed growth; General engine uses pure market movement.';