-- Create the admin_adjust_user_balance function
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_admin_id uuid,
  p_user_id uuid,
  p_balance_type text,
  p_action text,
  p_amount numeric,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
  v_valid_balance_types text[] := ARRAY['btc_balance', 'eth_balance', 'usdt_balance', 'interest_earned', 'commissions'];
  v_display_names jsonb := '{
    "btc_balance": "Bitcoin",
    "eth_balance": "Ethereum", 
    "usdt_balance": "Tether (USDT)",
    "interest_earned": "Interest Earned",
    "commissions": "Commissions"
  }'::jsonb;
  v_display_name text;
  v_transaction_type text;
BEGIN
  -- 1. Verify admin permissions
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied: Only admins can adjust user balances'
    );
  END IF;

  -- 2. Validate balance type
  IF NOT (p_balance_type = ANY(v_valid_balance_types)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid balance type: ' || p_balance_type
    );
  END IF;

  -- 3. Validate action
  IF p_action NOT IN ('increase', 'decrease') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid action: Must be "increase" or "decrease"'
    );
  END IF;

  -- 4. Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  -- 5. Validate reason
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reason is required for balance adjustments'
    );
  END IF;

  -- 6. Get display name for balance type
  v_display_name := v_display_names->>p_balance_type;

  -- 7. Lock user row and get current balance
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1 FOR UPDATE', p_balance_type)
  INTO v_current_balance
  USING p_user_id;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- 8. Calculate new balance
  IF p_action = 'increase' THEN
    v_new_balance := v_current_balance + p_amount;
    v_transaction_type := 'admin_credit';
  ELSE
    -- For decrease, ensure we don't go below 0
    IF v_current_balance < p_amount THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient balance. Current ' || v_display_name || ' balance: $' || v_current_balance::text || '. Cannot reduce by $' || p_amount::text
      );
    END IF;
    v_new_balance := v_current_balance - p_amount;
    v_transaction_type := 'admin_debit';
  END IF;

  -- 9. Update the balance
  EXECUTE format('
    UPDATE profiles 
    SET %I = $1, updated_at = now()
    WHERE id = $2
  ', p_balance_type)
  USING v_new_balance, p_user_id;

  -- 10. Recalculate net_balance
  PERFORM public.recalculate_net_balance(p_user_id);

  -- 11. Create transaction record (visible to user)
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    p_user_id,
    v_transaction_type,
    CASE WHEN p_action = 'increase' THEN p_amount ELSE -p_amount END,
    'Admin Adjustment (' || v_display_name || '): ' || p_reason
  );

  -- 12. Create admin audit log
  INSERT INTO admin_audit_logs (
    admin_user_id,
    target_user_id,
    action,
    table_name,
    old_values,
    new_values
  ) VALUES (
    p_admin_id,
    p_user_id,
    'balance_adjustment',
    'profiles',
    jsonb_build_object(
      'balance_type', p_balance_type,
      'previous_balance', v_current_balance,
      'action', p_action,
      'amount', p_amount
    ),
    jsonb_build_object(
      'balance_type', p_balance_type,
      'new_balance', v_new_balance,
      'reason', p_reason
    )
  );

  -- 13. Get updated balances for response
  RETURN (
    SELECT json_build_object(
      'success', true,
      'message', v_display_name || ' ' || p_action || 'd by $' || p_amount::text,
      'previous_balance', v_current_balance,
      'new_balance', v_new_balance,
      'balance_type', p_balance_type,
      'user_id', p_user_id,
      'btc_balance', COALESCE(btc_balance, 0),
      'eth_balance', COALESCE(eth_balance, 0),
      'usdt_balance', COALESCE(usdt_balance, 0),
      'interest_earned', COALESCE(interest_earned, 0),
      'commissions', COALESCE(commissions, 0),
      'net_balance', COALESCE(net_balance, 0)
    )
    FROM profiles
    WHERE id = p_user_id
  );
END;
$function$;