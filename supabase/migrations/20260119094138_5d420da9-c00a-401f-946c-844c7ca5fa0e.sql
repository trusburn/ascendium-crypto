-- Fix the calculate_trade_profit function to use REAL market prices for GENERAL engine
-- The formula: profit = (current_price - entry_price) / entry_price * initial_amount * direction_multiplier

CREATE OR REPLACE FUNCTION public.calculate_trade_profit(
  p_trade_id uuid,
  p_engine_type text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_profit numeric := 0;
  v_seconds_elapsed numeric;
  v_hours_elapsed numeric;
  v_direction_multiplier numeric;
  v_price_change_pct numeric;
  v_current_price numeric;
  v_entry_price numeric;
BEGIN
  -- Get trade details
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF v_trade IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate time elapsed
  v_seconds_elapsed := EXTRACT(EPOCH FROM (now() - v_trade.started_at));
  v_hours_elapsed := v_seconds_elapsed / 3600;
  
  -- Direction multiplier: BUY profits when price goes UP, SELL profits when price goes DOWN
  v_direction_multiplier := CASE 
    WHEN v_trade.trade_type = 'sell' THEN -1 
    ELSE 1 
  END;
  
  -- Get prices
  v_entry_price := COALESCE(v_trade.entry_price, 0);
  v_current_price := COALESCE(v_trade.current_price, v_entry_price);
  
  IF COALESCE(p_engine_type, 'rising') = 'rising' THEN
    -- RISING engine: Guaranteed upward profit over time
    v_profit := v_trade.initial_amount * v_trade.profit_multiplier * (v_hours_elapsed / 24);
    
    -- Apply direction for sell trades (still positive but slightly different)
    IF v_trade.trade_type = 'sell' THEN
      v_profit := v_profit * 0.95; -- Slightly less profit for shorts in rising mode
    END IF;
  ELSE
    -- GENERAL engine: Use REAL market price movement
    -- Formula: profit = (current_price - entry_price) / entry_price * initial_amount * direction
    
    IF v_entry_price > 0 AND v_current_price > 0 THEN
      -- Calculate percentage change
      v_price_change_pct := (v_current_price - v_entry_price) / v_entry_price;
      
      -- Apply to initial amount with direction
      -- BUY: profits when price goes up (positive change = positive profit)
      -- SELL: profits when price goes down (negative change * -1 = positive profit)
      v_profit := v_trade.initial_amount * v_price_change_pct * v_direction_multiplier;
      
      -- Cap losses at initial amount (can't lose more than invested)
      v_profit := GREATEST(v_profit, -v_trade.initial_amount);
    ELSE
      -- Fallback if prices are not set - use small time-based simulation
      v_profit := v_trade.initial_amount * 0.001 * v_hours_elapsed * v_direction_multiplier;
    END IF;
  END IF;
  
  RETURN ROUND(v_profit, 2);
END;
$$;

-- Also update sync_trading_profits to ensure current_price is synced from tradeable_assets
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_asset_price numeric;
  v_calculated_profit numeric;
  v_global_engine text;
  v_user_engine text;
  v_engine_type text;
BEGIN
  -- Get global engine setting
  SELECT COALESCE(value::text, '"rising"') INTO v_global_engine
  FROM admin_settings
  WHERE key = 'global_trading_engine';
  
  -- Clean up quotes
  v_global_engine := REPLACE(REPLACE(v_global_engine, '"', ''), '''', '');
  IF v_global_engine IS NULL OR v_global_engine = '' THEN
    v_global_engine := 'rising';
  END IF;

  -- Process each active trade
  FOR v_trade IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active'
  LOOP
    -- CRITICAL: Update current_price from tradeable_assets (this contains real market prices)
    IF v_trade.asset_current_price IS NOT NULL AND v_trade.asset_current_price > 0 THEN
      UPDATE trades 
      SET current_price = v_trade.asset_current_price,
          price_change_percent = CASE 
            WHEN v_trade.entry_price > 0 THEN 
              ((v_trade.asset_current_price - v_trade.entry_price) / v_trade.entry_price) * 100
            ELSE 0 
          END,
          last_updated = now()
      WHERE id = v_trade.id;
    END IF;
    
    -- Get user's engine preference
    SELECT engine_type::text INTO v_user_engine 
    FROM user_trading_engines 
    WHERE user_id = v_trade.user_id;
    
    IF v_user_engine IS NULL OR v_user_engine = 'default' THEN
      v_engine_type := v_global_engine;
    ELSE
      v_engine_type := v_user_engine;
    END IF;
    
    -- Calculate profit using the updated function (now uses real prices for GENERAL)
    v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_engine_type);
    
    -- Update trade with calculated profit
    UPDATE trades
    SET current_profit = v_calculated_profit,
        last_updated = now()
    WHERE id = v_trade.id;
    
    -- Update user's net_balance to reflect current P/L
    UPDATE profiles
    SET net_balance = COALESCE(base_balance, 0) + 
                      COALESCE(btc_balance, 0) + 
                      COALESCE(eth_balance, 0) + 
                      COALESCE(usdt_balance, 0) + 
                      COALESCE(interest_earned, 0) +
                      (SELECT COALESCE(SUM(current_profit), 0) FROM trades WHERE user_id = v_trade.user_id AND status = 'active'),
        updated_at = now()
    WHERE id = v_trade.user_id;
  END LOOP;
END;
$$;