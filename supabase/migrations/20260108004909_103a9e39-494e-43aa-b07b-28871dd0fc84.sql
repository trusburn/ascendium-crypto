
-- =====================================================
-- COMPREHENSIVE TRADING SYSTEM FIX
-- Real trading platform behavior with proper P/L tracking
-- =====================================================

-- 1. First, add trade_loss and trade_profit to transactions type check if not exists
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (
  type IN (
    'deposit',
    'withdrawal',
    'trade',
    'commission',
    'interest',
    'swap',
    'signal_purchase',
    'trade_profit',
    'trade_loss',
    'trade_liquidation'
  )
);

-- 2. FIX: sync_trading_profits - Must sync current_price from tradeable_assets BEFORE profit calculation
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
      
      IF v_asset_price IS NOT NULL THEN
        UPDATE trades 
        SET current_price = v_asset_price,
            price_change_percent = CASE 
              WHEN v_trade.entry_price > 0 THEN 
                ((v_asset_price - v_trade.entry_price) / v_trade.entry_price) * 100
              ELSE 0 
            END
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
    
    -- Calculate profit using the engine
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
      
      -- Create liquidation transaction record
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        v_trade.user_id,
        'trade_liquidation',
        -v_trade.initial_amount,
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
  
  -- Recalculate net balance for all affected users (includes active trade equity)
  FOR i IN 1..COALESCE(array_length(v_affected_users, 1), 0) LOOP
    IF v_affected_users[i] IS NOT NULL THEN
      PERFORM recalculate_net_balance(v_affected_users[i]);
    END IF;
  END LOOP;
END;
$$;

-- 3. FIX: update_live_interest_earned - REMOVE the destructive behavior
-- This function now ONLY updates trade current_profit and net_balance
-- It does NOT touch interest_earned (that only changes on trade close)
CREATE OR REPLACE FUNCTION public.update_live_interest_earned()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_trade RECORD;
  v_user_engine text;
  v_global_engine text;
  v_effective_engine text;
  v_calculated_profit NUMERIC;
  v_asset_price NUMERIC;
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
    
    -- Update each trade's current_price from tradeable_assets and recalc profit
    FOR v_trade IN 
      SELECT id, asset_id, entry_price FROM trades 
      WHERE user_id = v_user_record.user_id AND status = 'active'
    LOOP
      -- Sync current_price from tradeable_assets
      IF v_trade.asset_id IS NOT NULL THEN
        SELECT current_price INTO v_asset_price
        FROM tradeable_assets
        WHERE id = v_trade.asset_id;
        
        IF v_asset_price IS NOT NULL THEN
          UPDATE trades 
          SET current_price = v_asset_price,
              price_change_percent = CASE 
                WHEN v_trade.entry_price > 0 THEN 
                  ((v_asset_price - v_trade.entry_price) / v_trade.entry_price) * 100
                ELSE 0 
              END
          WHERE id = v_trade.id;
        END IF;
      END IF;
      
      -- Calculate and update profit
      v_calculated_profit := public.calculate_trade_profit(v_trade.id, v_effective_engine);
      
      UPDATE trades 
      SET current_profit = v_calculated_profit,
          last_updated = now()
      WHERE id = v_trade.id;
    END LOOP;
    
    -- ONLY recalculate net_balance (includes active trade equity)
    -- DO NOT touch interest_earned - that only changes when trade is closed
    PERFORM public.recalculate_net_balance(v_user_record.user_id);
  END LOOP;
END;
$$;

-- 4. FIX: purchase_signal - Accept balance source parameter
CREATE OR REPLACE FUNCTION public.purchase_signal(
  p_user_id uuid,
  p_signal_id uuid,
  p_balance_source text DEFAULT 'usdt_balance'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_price NUMERIC;
  v_signal_name TEXT;
  v_user_balance NUMERIC;
  v_new_balance NUMERIC;
  v_purchased_signal_id UUID;
  v_already_purchased BOOLEAN;
BEGIN
  -- Verify the user is purchasing for themselves
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Cannot purchase signals for other users'
    );
  END IF;

  -- Check if signal exists and get its price
  SELECT price, name INTO v_signal_price, v_signal_name
  FROM signals
  WHERE id = p_signal_id;

  IF v_signal_price IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Signal not found'
    );
  END IF;

  -- Check if user already purchased this signal
  SELECT EXISTS(
    SELECT 1 FROM purchased_signals
    WHERE user_id = p_user_id AND signal_id = p_signal_id
  ) INTO v_already_purchased;

  IF v_already_purchased THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Signal already purchased'
    );
  END IF;

  -- Get user's balance from the selected source
  CASE p_balance_source
    WHEN 'btc_balance' THEN
      SELECT COALESCE(btc_balance, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    WHEN 'eth_balance' THEN
      SELECT COALESCE(eth_balance, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    WHEN 'usdt_balance' THEN
      SELECT COALESCE(usdt_balance, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    WHEN 'interest_earned' THEN
      SELECT COALESCE(interest_earned, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    WHEN 'commissions' THEN
      SELECT COALESCE(commissions, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    WHEN 'base_balance' THEN
      SELECT COALESCE(base_balance, 0) INTO v_user_balance FROM profiles WHERE id = p_user_id;
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid balance source: ' || p_balance_source
      );
  END CASE;

  -- Check if user has sufficient balance
  IF v_user_balance < v_signal_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance in ' || p_balance_source,
      'required', v_signal_price,
      'available', v_user_balance,
      'balance_source', p_balance_source
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_user_balance - v_signal_price;

  -- Update user's selected balance
  CASE p_balance_source
    WHEN 'btc_balance' THEN
      UPDATE profiles SET btc_balance = v_new_balance, updated_at = now() WHERE id = p_user_id;
    WHEN 'eth_balance' THEN
      UPDATE profiles SET eth_balance = v_new_balance, updated_at = now() WHERE id = p_user_id;
    WHEN 'usdt_balance' THEN
      UPDATE profiles SET usdt_balance = v_new_balance, updated_at = now() WHERE id = p_user_id;
    WHEN 'interest_earned' THEN
      UPDATE profiles SET interest_earned = v_new_balance, updated_at = now() WHERE id = p_user_id;
    WHEN 'commissions' THEN
      UPDATE profiles SET commissions = v_new_balance, updated_at = now() WHERE id = p_user_id;
    WHEN 'base_balance' THEN
      UPDATE profiles SET base_balance = v_new_balance, updated_at = now() WHERE id = p_user_id;
  END CASE;

  -- Create purchased signal record
  INSERT INTO purchased_signals (user_id, signal_id, price_paid, status)
  VALUES (p_user_id, p_signal_id, v_signal_price, 'active')
  RETURNING id INTO v_purchased_signal_id;

  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'signal_purchase', -v_signal_price, 'Purchased ' || v_signal_name || ' signal from ' || p_balance_source);

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN json_build_object(
    'success', true,
    'purchased_signal_id', v_purchased_signal_id,
    'signal_name', v_signal_name,
    'amount_paid', v_signal_price,
    'new_balance', v_new_balance,
    'balance_source', p_balance_source
  );
END;
$$;

-- 5. IMPROVED: recalculate_net_balance - ensure base_balance is included
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_static_balance numeric;
  v_active_trade_equity numeric;
  v_total numeric;
BEGIN
  -- Calculate static balances (all balances including base_balance)
  SELECT 
    COALESCE(btc_balance, 0) + 
    COALESCE(eth_balance, 0) + 
    COALESCE(usdt_balance, 0) + 
    COALESCE(base_balance, 0) +
    COALESCE(interest_earned, 0) + 
    COALESCE(commissions, 0)
  INTO v_static_balance
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Calculate active trade equity (initial_amount + current_profit for active trades)
  -- This represents the real-time value of open positions
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_trading_profits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_live_interest_earned() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_signal(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_net_balance(uuid) TO authenticated;
