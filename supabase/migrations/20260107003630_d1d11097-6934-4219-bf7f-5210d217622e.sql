-- Add crypto balance columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS btc_balance numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS eth_balance numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS usdt_balance numeric DEFAULT 0.00;

-- Reset all existing users crypto balances to 0 (unless they have approved deposits)
-- First, set all to 0
UPDATE public.profiles 
SET btc_balance = 0, eth_balance = 0, usdt_balance = 0;

-- Create a function to recalculate net_balance based on all balances
CREATE OR REPLACE FUNCTION public.recalculate_net_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
BEGIN
  SELECT 
    COALESCE(btc_balance, 0) + 
    COALESCE(eth_balance, 0) + 
    COALESCE(usdt_balance, 0) + 
    COALESCE(interest_earned, 0) + 
    COALESCE(commissions, 0)
  INTO v_total
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Update the net_balance
  UPDATE profiles 
  SET net_balance = v_total
  WHERE id = p_user_id;
  
  RETURN v_total;
END;
$function$;

-- Create a function to handle deposit approval - adds to specific crypto balance
CREATE OR REPLACE FUNCTION public.approve_deposit(
  p_deposit_id uuid,
  p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deposit RECORD;
  v_balance_column text;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Get deposit details
  SELECT * INTO v_deposit FROM deposits WHERE id = p_deposit_id;
  
  IF v_deposit IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit not found');
  END IF;
  
  IF v_deposit.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Deposit is not pending');
  END IF;
  
  -- Determine which balance column to update based on crypto_type
  CASE v_deposit.crypto_type
    WHEN 'bitcoin' THEN v_balance_column := 'btc_balance';
    WHEN 'ethereum' THEN v_balance_column := 'eth_balance';
    WHEN 'usdt' THEN v_balance_column := 'usdt_balance';
    ELSE v_balance_column := 'usdt_balance'; -- default to USDT
  END CASE;
  
  -- Update the deposit status
  UPDATE deposits 
  SET status = 'approved', 
      approved_by = p_admin_id, 
      approved_at = now()
  WHERE id = p_deposit_id;
  
  -- Update the specific crypto balance
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) + $1
    WHERE id = $2
  ', v_balance_column, v_balance_column)
  USING v_deposit.amount, v_deposit.user_id;
  
  -- Recalculate net_balance
  PERFORM public.recalculate_net_balance(v_deposit.user_id);
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    v_deposit.user_id, 
    'deposit', 
    v_deposit.amount, 
    'Deposit of $' || v_deposit.amount || ' to ' || v_deposit.crypto_type
  );
  
  RETURN json_build_object(
    'success', true, 
    'amount', v_deposit.amount,
    'crypto_type', v_deposit.crypto_type,
    'user_id', v_deposit.user_id
  );
END;
$function$;

-- Create a function to handle withdrawal approval - deducts from specific crypto balance
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id uuid,
  p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal RECORD;
  v_balance_column text;
  v_current_balance numeric;
  v_source text;
BEGIN
  -- Get withdrawal details
  SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;
  
  IF v_withdrawal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal is not pending');
  END IF;
  
  -- Get the source (which balance to deduct from)
  v_source := COALESCE(v_withdrawal.source, 'usdt_balance');
  
  -- Map source to balance column
  CASE v_source
    WHEN 'btc_balance' THEN v_balance_column := 'btc_balance';
    WHEN 'eth_balance' THEN v_balance_column := 'eth_balance';
    WHEN 'usdt_balance' THEN v_balance_column := 'usdt_balance';
    WHEN 'interest_earned' THEN v_balance_column := 'interest_earned';
    WHEN 'commissions' THEN v_balance_column := 'commissions';
    -- Legacy source mapping
    WHEN 'net_balance' THEN v_balance_column := 'usdt_balance';
    ELSE v_balance_column := 'usdt_balance';
  END CASE;
  
  -- Check if user has sufficient balance
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', v_balance_column)
  INTO v_current_balance
  USING v_withdrawal.user_id;
  
  IF v_current_balance < v_withdrawal.amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance. Available: $' || v_current_balance::text
    );
  END IF;
  
  -- Update the withdrawal status
  UPDATE withdrawals 
  SET status = 'approved', 
      approved_by = p_admin_id, 
      approved_at = now()
  WHERE id = p_withdrawal_id;
  
  -- Deduct from the specific balance
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) - $1
    WHERE id = $2
  ', v_balance_column, v_balance_column)
  USING v_withdrawal.amount, v_withdrawal.user_id;
  
  -- Recalculate net_balance
  PERFORM public.recalculate_net_balance(v_withdrawal.user_id);
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    v_withdrawal.user_id, 
    'withdrawal', 
    -v_withdrawal.amount, 
    'Withdrawal of $' || v_withdrawal.amount || ' from ' || v_source || ' to ' || v_withdrawal.crypto_type
  );
  
  RETURN json_build_object(
    'success', true, 
    'amount', v_withdrawal.amount,
    'source', v_source,
    'user_id', v_withdrawal.user_id
  );
END;
$function$;

-- Create a function for internal swaps between balances
CREATE OR REPLACE FUNCTION public.swap_balances(
  p_user_id uuid,
  p_from_balance text,
  p_to_balance text,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_from_current numeric;
  v_valid_balances text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
BEGIN
  -- Verify user is swapping their own balance
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Validate balance types
  IF NOT (p_from_balance = ANY(v_valid_balances)) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid source balance type');
  END IF;
  
  IF NOT (p_to_balance = ANY(v_valid_balances)) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid destination balance type');
  END IF;
  
  IF p_from_balance = p_to_balance THEN
    RETURN json_build_object('success', false, 'error', 'Cannot swap to the same balance');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Check source balance
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', p_from_balance)
  INTO v_from_current
  USING p_user_id;
  
  IF v_from_current < p_amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance. Available: $' || v_from_current::text
    );
  END IF;
  
  -- Deduct from source
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) - $1
    WHERE id = $2
  ', p_from_balance, p_from_balance)
  USING p_amount, p_user_id;
  
  -- Add to destination
  EXECUTE format('
    UPDATE profiles 
    SET %I = COALESCE(%I, 0) + $1
    WHERE id = $2
  ', p_to_balance, p_to_balance)
  USING p_amount, p_user_id;
  
  -- Net balance stays the same (no need to recalculate as it's 1:1 swap)
  -- But recalculate anyway to ensure consistency
  PERFORM public.recalculate_net_balance(p_user_id);
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id, 
    'swap', 
    p_amount, 
    'Swap $' || p_amount || ' from ' || p_from_balance || ' to ' || p_to_balance
  );
  
  RETURN json_build_object(
    'success', true, 
    'amount', p_amount,
    'from', p_from_balance,
    'to', p_to_balance
  );
END;
$function$;