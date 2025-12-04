-- Create a secure function to deduct trade balance
CREATE OR REPLACE FUNCTION public.deduct_trade_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_current_base_balance NUMERIC;
  v_current_total_invested NUMERIC;
BEGIN
  -- Get current balances
  SELECT net_balance, base_balance, total_invested 
  INTO v_current_balance, v_current_base_balance, v_current_total_invested
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Check if user has enough balance
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct from balances and add to total_invested
  UPDATE profiles 
  SET 
    net_balance = COALESCE(net_balance, 0) - p_amount,
    base_balance = COALESCE(base_balance, 0) - p_amount,
    total_invested = COALESCE(total_invested, 0) + p_amount,
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;