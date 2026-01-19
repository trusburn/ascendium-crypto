-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS public.stop_single_trade(uuid, uuid);
DROP FUNCTION IF EXISTS public.stop_all_user_trades(uuid);

-- Recreate stop_single_trade to return funds to source_balance
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
  -- Get trade details including source_balance
  SELECT * INTO v_trade
  FROM trades
  WHERE id = p_trade_id AND user_id = p_user_id AND status = 'active';

  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade not found or already closed';
  END IF;

  -- Get source balance (default to usdt_balance for old trades)
  v_source_balance := COALESCE(v_trade.source_balance, 'usdt_balance');

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
      v_final_profit := v_trade.initial_amount * ((v_live_price - v_trade.entry_price) / v_trade.entry_price) * v_trade.profit_multiplier;
    ELSE
      v_final_profit := v_trade.initial_amount * ((v_trade.entry_price - v_live_price) / v_trade.entry_price) * v_trade.profit_multiplier;
    END IF;
  ELSE
    v_final_profit := COALESCE(v_trade.current_profit, 0);
  END IF;

  -- Calculate return amount (initial + profit, but never negative)
  v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);

  -- Return funds to the SAME source balance that was used to open
  EXECUTE format('UPDATE profiles SET %I = COALESCE(%I, 0) + $1, total_invested = GREATEST(COALESCE(total_invested, 0) - $2, 0) WHERE id = $3', 
    v_source_balance, v_source_balance)
    USING v_return_amount, v_trade.initial_amount, p_user_id;

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
    format('Closed trade: %s %s. Return: $%.2f (Profit: %s$%.2f) to %s',
      UPPER(v_trade.trade_direction), COALESCE(v_trade.trading_pair, 'unknown'),
      v_return_amount,
      CASE WHEN v_final_profit >= 0 THEN '+' ELSE '' END, v_final_profit,
      v_source_balance)
  );

  -- Recalculate net balance
  PERFORM recalculate_net_balance(p_user_id);

  RETURN true;
END;
$$;

-- Recreate stop_all_user_trades to return funds to respective source balances
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
        v_final_profit := v_trade.initial_amount * ((v_live_price - v_trade.entry_price) / v_trade.entry_price) * v_trade.profit_multiplier;
      ELSE
        v_final_profit := v_trade.initial_amount * ((v_trade.entry_price - v_live_price) / v_trade.entry_price) * v_trade.profit_multiplier;
      END IF;
    ELSE
      v_final_profit := COALESCE(v_trade.current_profit, 0);
    END IF;

    -- Calculate return amount
    v_return_amount := GREATEST(v_trade.initial_amount + v_final_profit, 0);

    -- Return funds to the SAME source balance
    EXECUTE format('UPDATE profiles SET %I = COALESCE(%I, 0) + $1, total_invested = GREATEST(COALESCE(total_invested, 0) - $2, 0) WHERE id = $3', 
      v_source_balance, v_source_balance)
      USING v_return_amount, v_trade.initial_amount, p_user_id;

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
      format('Closed %s trades. Total returned: $%.2f (Net profit: %s$%.2f)',
        v_trades_closed, v_total_returned,
        CASE WHEN v_total_profit >= 0 THEN '+' ELSE '' END, v_total_profit)
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