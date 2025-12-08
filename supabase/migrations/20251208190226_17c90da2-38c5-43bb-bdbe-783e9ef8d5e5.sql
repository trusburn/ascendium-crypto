-- Update stop_all_user_trades to properly reset interest_earned after stopping
-- The final profit is captured and kept, interest_earned is set to that final value
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_profit NUMERIC := 0;
  v_total_initial_amount NUMERIC := 0;
  v_trades_stopped INTEGER := 0;
  v_trade_details jsonb := '[]'::jsonb;
  v_trade RECORD;
BEGIN
  -- Loop through active trades and collect details
  FOR v_trade IN 
    SELECT 
      t.id,
      t.initial_amount,
      t.current_profit,
      t.trade_type,
      t.entry_price,
      t.current_price,
      t.started_at,
      t.asset_id,
      COALESCE(a.symbol, 'N/A') as asset_symbol,
      COALESCE(a.name, 'Unknown') as asset_name
    FROM trades t
    LEFT JOIN tradeable_assets a ON t.asset_id = a.id
    WHERE t.user_id = p_user_id AND t.status = 'active'
  LOOP
    -- Add trade details to array
    v_trade_details := v_trade_details || jsonb_build_object(
      'id', v_trade.id,
      'trade_type', v_trade.trade_type,
      'initial_amount', v_trade.initial_amount,
      'profit', COALESCE(v_trade.current_profit, 0),
      'entry_price', v_trade.entry_price,
      'exit_price', v_trade.current_price,
      'asset_symbol', v_trade.asset_symbol,
      'asset_name', v_trade.asset_name,
      'started_at', v_trade.started_at,
      'stopped_at', now()
    );
    
    -- Accumulate ALL profits (the current_profit has the live value)
    v_total_profit := v_total_profit + COALESCE(v_trade.current_profit, 0);
    
    -- Accumulate initial amounts
    v_total_initial_amount := v_total_initial_amount + COALESCE(v_trade.initial_amount, 0);
    
    v_trades_stopped := v_trades_stopped + 1;
  END LOOP;
  
  -- If no active trades, return early
  IF v_trades_stopped = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active trades to stop',
      'trades_stopped', 0,
      'total_profit', 0,
      'trade_details', '[]'::jsonb
    );
  END IF;
  
  -- Update all active trades to stopped
  UPDATE trades 
  SET status = 'stopped', last_updated = now()
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Keep the final profit in interest_earned (it was being updated live)
  -- Just make sure net_balance reflects the final state
  -- interest_earned stays as it was (the live profit), we don't need to add more
  UPDATE profiles 
  SET 
    net_balance = COALESCE(base_balance, 0) + COALESCE(interest_earned, 0)
    -- interest_earned already has the live profit from update_live_interest_earned
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trades stopped successfully',
    'trades_stopped', v_trades_stopped,
    'total_profit', v_total_profit,
    'total_initial_amount', v_total_initial_amount,
    'trade_details', v_trade_details
  );
END;
$$;