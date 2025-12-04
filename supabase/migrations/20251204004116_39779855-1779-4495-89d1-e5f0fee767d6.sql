-- Create a function to stop all trades for a user and update their balance
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_profit NUMERIC := 0;
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
    
    -- Accumulate profit (only positive profits go to interest_earned)
    IF v_trade.current_profit > 0 THEN
      v_total_profit := v_total_profit + v_trade.current_profit;
    END IF;
    
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
  SET status = 'stopped'
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Update user's balance: add profits to base_balance, net_balance, and interest_earned
  -- Also return invested amount back to balances
  UPDATE profiles 
  SET 
    base_balance = COALESCE(base_balance, 0) + v_total_profit + (
      SELECT COALESCE(SUM(initial_amount), 0) 
      FROM trades 
      WHERE user_id = p_user_id AND status = 'stopped' 
      AND stopped_at IS NULL
    ),
    net_balance = COALESCE(net_balance, 0) + v_total_profit + (
      SELECT COALESCE(SUM(initial_amount), 0) 
      FROM trades 
      WHERE user_id = p_user_id AND status = 'stopped' 
      AND stopped_at IS NULL
    ),
    interest_earned = COALESCE(interest_earned, 0) + v_total_profit,
    total_invested = GREATEST(0, COALESCE(total_invested, 0) - (
      SELECT COALESCE(SUM(initial_amount), 0) 
      FROM trades 
      WHERE user_id = p_user_id AND status = 'stopped' 
      AND stopped_at IS NULL
    ))
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trades stopped successfully',
    'trades_stopped', v_trades_stopped,
    'total_profit', v_total_profit,
    'trade_details', v_trade_details
  );
END;
$$;