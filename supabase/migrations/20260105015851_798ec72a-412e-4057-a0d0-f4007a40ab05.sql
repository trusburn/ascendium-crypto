-- Create a secure function to handle signal purchases
-- This uses SECURITY DEFINER to bypass RLS safely

CREATE OR REPLACE FUNCTION public.purchase_signal(
  p_user_id UUID,
  p_signal_id UUID
)
RETURNS JSON
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

  -- Get user's current balance
  SELECT COALESCE(base_balance, 0) INTO v_user_balance
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has sufficient balance
  IF v_user_balance < v_signal_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'required', v_signal_price,
      'available', v_user_balance
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_user_balance - v_signal_price;

  -- Update user's balance
  UPDATE profiles
  SET 
    base_balance = v_new_balance,
    net_balance = COALESCE(net_balance, 0) - v_signal_price,
    updated_at = now()
  WHERE id = p_user_id;

  -- Create purchased signal record
  INSERT INTO purchased_signals (user_id, signal_id, price_paid, status)
  VALUES (p_user_id, p_signal_id, v_signal_price, 'active')
  RETURNING id INTO v_purchased_signal_id;

  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'signal_purchase', -v_signal_price, 'Purchased ' || v_signal_name || ' signal');

  RETURN json_build_object(
    'success', true,
    'purchased_signal_id', v_purchased_signal_id,
    'signal_name', v_signal_name,
    'amount_paid', v_signal_price,
    'new_balance', v_new_balance
  );
END;
$$;