
-- Drop existing functions first to change return type
DROP FUNCTION IF EXISTS public.stop_single_trade(uuid, uuid);
DROP FUNCTION IF EXISTS public.stop_all_user_trades(uuid);

-- Fix fund flow: profits → interest_earned, losses → remaining to source wallet
CREATE FUNCTION public.stop_single_trade(p_trade_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_current_profit numeric;
  v_source_balance text;
  v_return_amount numeric;
BEGIN
  SELECT * INTO v_trade
  FROM trades
  WHERE id = p_trade_id AND user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found or already closed');
  END IF;

  v_current_profit := COALESCE(v_trade.current_profit, 0);
  v_source_balance := COALESCE(v_trade.source_balance, 'usdt_balance');
  v_return_amount := v_trade.initial_amount + v_current_profit;
  
  IF v_return_amount < 0 THEN
    v_return_amount := 0;
  END IF;

  IF v_current_profit >= 0 THEN
    -- PROFIT: entire amount (initial + profit) goes to interest_earned
    UPDATE profiles
    SET interest_earned = interest_earned + v_return_amount,
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    -- LOSS: return remaining amount back to source wallet
    UPDATE profiles
    SET 
      btc_balance = CASE WHEN v_source_balance = 'btc_balance' THEN btc_balance + v_return_amount ELSE btc_balance END,
      eth_balance = CASE WHEN v_source_balance = 'eth_balance' THEN eth_balance + v_return_amount ELSE eth_balance END,
      usdt_balance = CASE WHEN v_source_balance = 'usdt_balance' THEN usdt_balance + v_return_amount ELSE usdt_balance END,
      interest_earned = CASE WHEN v_source_balance = 'interest_earned' THEN interest_earned + v_return_amount ELSE interest_earned END,
      commissions = CASE WHEN v_source_balance = 'commissions' THEN commissions + v_return_amount ELSE commissions END,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  UPDATE trades
  SET status = 'stopped',
      exit_price = COALESCE(current_price, entry_price),
      closed_at = now(),
      updated_at = now()
  WHERE id = p_trade_id;

  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (
    p_user_id,
    CASE WHEN v_current_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
    v_return_amount,
    'completed',
    CASE 
      WHEN v_current_profit >= 0 THEN 'Trade profit $' || ROUND(v_current_profit, 2) || ' - total $' || ROUND(v_return_amount, 2) || ' to interest_earned'
      ELSE 'Trade loss $' || ROUND(ABS(v_current_profit), 2) || ' - remaining $' || ROUND(v_return_amount, 2) || ' to ' || v_source_balance
    END
  );

  PERFORM recalculate_net_balance(p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', p_trade_id,
    'profit', v_current_profit,
    'returned_amount', v_return_amount,
    'destination', CASE WHEN v_current_profit >= 0 THEN 'interest_earned' ELSE v_source_balance END
  );
END;
$$;

CREATE FUNCTION public.stop_all_user_trades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_total_profit numeric := 0;
  v_total_returned numeric := 0;
  v_trades_closed integer := 0;
  v_current_profit numeric;
  v_source_balance text;
  v_return_amount numeric;
BEGIN
  FOR v_trade IN 
    SELECT * FROM trades 
    WHERE user_id = p_user_id AND status = 'active'
  LOOP
    v_current_profit := COALESCE(v_trade.current_profit, 0);
    v_source_balance := COALESCE(v_trade.source_balance, 'usdt_balance');
    v_return_amount := v_trade.initial_amount + v_current_profit;
    
    IF v_return_amount < 0 THEN
      v_return_amount := 0;
    END IF;

    IF v_current_profit >= 0 THEN
      UPDATE profiles
      SET interest_earned = interest_earned + v_return_amount,
          updated_at = now()
      WHERE id = p_user_id;
    ELSE
      UPDATE profiles
      SET 
        btc_balance = CASE WHEN v_source_balance = 'btc_balance' THEN btc_balance + v_return_amount ELSE btc_balance END,
        eth_balance = CASE WHEN v_source_balance = 'eth_balance' THEN eth_balance + v_return_amount ELSE eth_balance END,
        usdt_balance = CASE WHEN v_source_balance = 'usdt_balance' THEN usdt_balance + v_return_amount ELSE usdt_balance END,
        interest_earned = CASE WHEN v_source_balance = 'interest_earned' THEN interest_earned + v_return_amount ELSE interest_earned END,
        commissions = CASE WHEN v_source_balance = 'commissions' THEN commissions + v_return_amount ELSE commissions END,
        updated_at = now()
      WHERE id = p_user_id;
    END IF;

    UPDATE trades
    SET status = 'stopped',
        exit_price = COALESCE(current_price, entry_price),
        closed_at = now(),
        updated_at = now()
    WHERE id = v_trade.id;

    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (
      p_user_id,
      CASE WHEN v_current_profit >= 0 THEN 'trade_profit' ELSE 'trade_loss' END,
      v_return_amount,
      'completed',
      CASE 
        WHEN v_current_profit >= 0 THEN 'Trade profit $' || ROUND(v_current_profit, 2) || ' - total $' || ROUND(v_return_amount, 2) || ' to interest_earned'
        ELSE 'Trade loss $' || ROUND(ABS(v_current_profit), 2) || ' - remaining $' || ROUND(v_return_amount, 2) || ' to ' || v_source_balance
      END
    );

    v_total_profit := v_total_profit + v_current_profit;
    v_total_returned := v_total_returned + v_return_amount;
    v_trades_closed := v_trades_closed + 1;
  END LOOP;

  PERFORM recalculate_net_balance(p_user_id);

  RETURN jsonb_build_object(
    'trades_closed', v_trades_closed,
    'total_returned', v_total_returned,
    'total_profit', v_total_profit
  );
END;
$$;
