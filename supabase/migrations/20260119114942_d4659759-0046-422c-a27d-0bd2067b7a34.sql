-- Fix stop_single_trade - use proper format() with USING clause
CREATE OR REPLACE FUNCTION public.stop_single_trade(p_trade_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_live_price numeric;
  v_final_profit numeric;
  v_return_amount numeric;
  v_source_balance text;
BEGIN
  -- Get trade details
  SELECT * INTO v_trade
  FROM trades
  WHERE id = p_trade_id AND user_id = p_user_id AND status = 'active';

  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade not found or already closed';
  END IF;

  -- Get source balance (default to usdt_balance for old trades)
  v_source_balance := COALESCE(v_trade.source_balance, 'usdt_balance');
  
  -- Validate source_balance is a valid column name
  IF v_source_balance NOT IN ('btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions') THEN
    v_source_balance := 'usdt_balance';
  END IF;

  -- Get current market price
  IF v_trade.asset_id IS NOT NULL THEN
    SELECT COALESCE(current_price, v_trade.entry_price) INTO v_live_price
    FROM tradeable_assets WHERE id = v_trade.asset_id;
  ELSE
    v_live_price := COALESCE(v_trade.current_price, v_trade.entry_price);
  END IF;

  -- Calculate profit based on trade direction
  IF v_trade.entry_price > 0 AND v_live_price > 0 THEN
    IF v_trade.trade_direction = 'buy' THEN
      v_final_profit := v_trade.initial_amount * ((v_live_price - v_trade.entry_price) / v_trade.entry_price) * COALESCE(v_trade.profit_multiplier, 1);
    ELSE
      v_final_profit := v_trade.initial_amount * ((v_trade.entry_price - v_live_price) / v_trade.entry_price) * COALESCE(v_trade.profit_multiplier, 1);
    END IF;
  ELSE
    v_final_profit := COALESCE(v_trade.current_profit, 0);
  END IF;

  -- Calculate return amount (initial + profit, but never negative)
  v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);

  -- Return funds to the source balance using CASE instead of dynamic SQL
  UPDATE profiles SET
    btc_balance = CASE WHEN v_source_balance = 'btc_balance' THEN COALESCE(btc_balance, 0) + v_return_amount ELSE btc_balance END,
    eth_balance = CASE WHEN v_source_balance = 'eth_balance' THEN COALESCE(eth_balance, 0) + v_return_amount ELSE eth_balance END,
    usdt_balance = CASE WHEN v_source_balance = 'usdt_balance' THEN COALESCE(usdt_balance, 0) + v_return_amount ELSE usdt_balance END,
    interest_earned = CASE WHEN v_source_balance = 'interest_earned' THEN COALESCE(interest_earned, 0) + v_return_amount ELSE interest_earned END,
    commissions = CASE WHEN v_source_balance = 'commissions' THEN COALESCE(commissions, 0) + v_return_amount ELSE commissions END,
    total_invested = GREATEST(COALESCE(total_invested, 0) - v_trade.initial_amount, 0)
  WHERE id = p_user_id;

  -- Update trade status
  UPDATE trades SET
    status = 'stopped',
    current_profit = v_final_profit,
    current_price = v_live_price,
    last_updated = now()
  WHERE id = p_trade_id;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id,
    CASE WHEN v_final_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
    v_return_amount,
    'Closed trade: ' || UPPER(COALESCE(v_trade.trade_direction, 'buy')) || ' ' || COALESCE(v_trade.trading_pair, 'unknown') || 
    '. Return: $' || ROUND(v_return_amount, 2) || ' (Profit: ' || 
    CASE WHEN v_final_profit >= 0 THEN '+' ELSE '' END || ROUND(v_final_profit, 2) || ') to ' || v_source_balance
  );

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN true;
END;
$$;

-- Fix stop_all_user_trades - use CASE instead of dynamic SQL
CREATE OR REPLACE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_live_price numeric;
  v_final_profit numeric;
  v_return_amount numeric;
  v_source_balance text;
  v_total_returned numeric := 0;
  v_total_profit numeric := 0;
  v_trades_closed int := 0;
BEGIN
  -- Process each active trade
  FOR v_trade IN 
    SELECT * FROM trades 
    WHERE user_id = p_user_id AND status = 'active'
  LOOP
    -- Get source balance
    v_source_balance := COALESCE(v_trade.source_balance, 'usdt_balance');
    
    -- Validate source_balance
    IF v_source_balance NOT IN ('btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions') THEN
      v_source_balance := 'usdt_balance';
    END IF;

    -- Get current market price
    IF v_trade.asset_id IS NOT NULL THEN
      SELECT COALESCE(current_price, v_trade.entry_price) INTO v_live_price
      FROM tradeable_assets WHERE id = v_trade.asset_id;
    ELSE
      v_live_price := COALESCE(v_trade.current_price, v_trade.entry_price);
    END IF;

    -- Calculate profit
    IF v_trade.entry_price > 0 AND v_live_price > 0 THEN
      IF v_trade.trade_direction = 'buy' THEN
        v_final_profit := v_trade.initial_amount * ((v_live_price - v_trade.entry_price) / v_trade.entry_price) * COALESCE(v_trade.profit_multiplier, 1);
      ELSE
        v_final_profit := v_trade.initial_amount * ((v_trade.entry_price - v_live_price) / v_trade.entry_price) * COALESCE(v_trade.profit_multiplier, 1);
      END IF;
    ELSE
      v_final_profit := COALESCE(v_trade.current_profit, 0);
    END IF;

    -- Calculate return amount
    v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);

    -- Return funds to the source balance using CASE
    UPDATE profiles SET
      btc_balance = CASE WHEN v_source_balance = 'btc_balance' THEN COALESCE(btc_balance, 0) + v_return_amount ELSE btc_balance END,
      eth_balance = CASE WHEN v_source_balance = 'eth_balance' THEN COALESCE(eth_balance, 0) + v_return_amount ELSE eth_balance END,
      usdt_balance = CASE WHEN v_source_balance = 'usdt_balance' THEN COALESCE(usdt_balance, 0) + v_return_amount ELSE usdt_balance END,
      interest_earned = CASE WHEN v_source_balance = 'interest_earned' THEN COALESCE(interest_earned, 0) + v_return_amount ELSE interest_earned END,
      commissions = CASE WHEN v_source_balance = 'commissions' THEN COALESCE(commissions, 0) + v_return_amount ELSE commissions END,
      total_invested = GREATEST(COALESCE(total_invested, 0) - v_trade.initial_amount, 0)
    WHERE id = p_user_id;

    -- Update trade
    UPDATE trades SET
      status = 'stopped',
      current_profit = v_final_profit,
      current_price = v_live_price,
      last_updated = now()
    WHERE id = v_trade.id;

    -- Track totals
    v_total_returned := v_total_returned + v_return_amount;
    v_total_profit := v_total_profit + v_final_profit;
    v_trades_closed := v_trades_closed + 1;
  END LOOP;

  -- Record summary transaction if any trades were closed
  IF v_trades_closed > 0 THEN
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      p_user_id,
      CASE WHEN v_total_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
      v_total_returned,
      'Closed ' || v_trades_closed || ' trades. Total returned: $' || ROUND(v_total_returned, 2) || 
      ' (Net profit: ' || CASE WHEN v_total_profit >= 0 THEN '+' ELSE '' END || ROUND(v_total_profit, 2) || ')'
    );
  END IF;

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN json_build_object(
    'trades_closed', v_trades_closed,
    'total_returned', v_total_returned,
    'total_profit', v_total_profit
  );
END;
$$;