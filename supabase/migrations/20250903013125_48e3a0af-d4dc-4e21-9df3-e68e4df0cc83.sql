-- Fix the sync function with proper WHERE clause
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN  
  -- Update all user profiles with current trading profits
  UPDATE public.profiles 
  SET 
    interest_earned = COALESCE((
      SELECT SUM(
        -- Calculate current profit based on time elapsed since trade started
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 86400) -- Convert to days
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
      SELECT SUM(
        -- Same calculation for net balance - trading profits get added to base balance
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 86400)
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0)
  WHERE id IS NOT NULL; -- Add WHERE clause to satisfy PostgreSQL requirement
  
  -- Also update the current_profit in trades table for consistency
  UPDATE public.trades 
  SET 
    current_profit = initial_amount * profit_multiplier * 
      (EXTRACT(EPOCH FROM (now() - started_at)) / 86400),
    last_updated = now()
  WHERE status = 'active';
END;
$$;