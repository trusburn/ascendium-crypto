-- Create a function to deduct trade balance from a specific balance source
CREATE OR REPLACE FUNCTION public.deduct_trade_from_balance(
  p_user_id uuid, 
  p_amount numeric, 
  p_balance_source text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_valid_balances text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
BEGIN
  -- Validate balance source
  IF NOT (p_balance_source = ANY(v_valid_balances)) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if amount is valid
  IF p_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get current balance from the specified source
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', p_balance_source)
  INTO v_current_balance
  USING p_user_id;
  
  -- Check if user has enough balance
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct from the specified balance
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) - $1,
        total_invested = COALESCE(total_invested, 0) + $1,
        updated_at = now()
    WHERE id = $2
  ', p_balance_source, p_balance_source)
  USING p_amount, p_user_id;
  
  -- Recalculate net_balance
  PERFORM public.recalculate_net_balance(p_user_id);
  
  RETURN TRUE;
END;
$$;