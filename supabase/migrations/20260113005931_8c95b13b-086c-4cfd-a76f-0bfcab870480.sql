-- Drop existing functions first to change return type
DROP FUNCTION IF EXISTS public.check_sl_tp_triggers();
DROP FUNCTION IF EXISTS public.check_trade_expiration();

-- Improved check_sl_tp_triggers with better price handling and proper triggering
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
BEGIN
  FOR trade_rec IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active' 
    AND (t.stop_loss IS NOT NULL OR t.take_profit IS NOT NULL)
  LOOP
    -- Use the most recent price available
    v_current_price := COALESCE(
      trade_rec.asset_current_price, 
      trade_rec.current_price, 
      trade_rec.entry_price
    );
    v_should_close := false;
    v_close_reason := '';
    
    -- Check stop loss
    IF trade_rec.stop_loss IS NOT NULL THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price <= trade_rec.stop_loss THEN
        v_should_close := true;
        v_close_reason := 'Stop Loss triggered at $' || ROUND(v_current_price::numeric, 2)::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price >= trade_rec.stop_loss THEN
        v_should_close := true;
        v_close_reason := 'Stop Loss triggered at $' || ROUND(v_current_price::numeric, 2)::text;
      END IF;
    END IF;
    
    -- Check take profit (only if not already closing from SL)
    IF trade_rec.take_profit IS NOT NULL AND NOT v_should_close THEN
      IF trade_rec.trade_direction = 'buy' AND v_current_price >= trade_rec.take_profit THEN
        v_should_close := true;
        v_close_reason := 'Take Profit triggered at $' || ROUND(v_current_price::numeric, 2)::text;
      ELSIF trade_rec.trade_direction = 'sell' AND v_current_price <= trade_rec.take_profit THEN
        v_should_close := true;
        v_close_reason := 'Take Profit triggered at $' || ROUND(v_current_price::numeric, 2)::text;
      END IF;
    END IF;
    
    IF v_should_close THEN
      v_final_profit := COALESCE(trade_rec.current_profit, 0);
      v_triggered_count := v_triggered_count + 1;
      
      -- Update trade status to stopped
      UPDATE trades 
      SET status = 'stopped', 
          last_updated = now(),
          current_price = v_current_price
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
      
      -- Record the transaction
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        trade_rec.user_id,
        CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
        ABS(v_final_profit),
        v_close_reason || ' on ' || COALESCE(trade_rec.trading_pair, trade_rec.asset_pair, 'Unknown')
      );
    END IF;
  END LOOP;
  
  RETURN json_build_object('triggered_count', v_triggered_count);
END;
$$;

-- Improved check_trade_expiration function
CREATE OR REPLACE FUNCTION public.check_trade_expiration()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_rec RECORD;
  v_final_profit numeric;
  v_expired_count integer := 0;
BEGIN
  FOR trade_rec IN 
    SELECT t.*, ta.current_price as asset_current_price
    FROM trades t
    LEFT JOIN tradeable_assets ta ON t.asset_id = ta.id
    WHERE t.status = 'active' 
    AND t.expires_at IS NOT NULL 
    AND t.expires_at <= now()
  LOOP
    v_final_profit := COALESCE(trade_rec.current_profit, 0);
    v_expired_count := v_expired_count + 1;
    
    -- Update trade status to stopped
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
    
    -- Record the transaction
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      trade_rec.user_id,
      CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
      ABS(v_final_profit),
      'Trade expired on ' || COALESCE(trade_rec.trading_pair, trade_rec.asset_pair, 'Unknown')
    );
  END LOOP;
  
  RETURN json_build_object('expired_count', v_expired_count);
END;
$$;