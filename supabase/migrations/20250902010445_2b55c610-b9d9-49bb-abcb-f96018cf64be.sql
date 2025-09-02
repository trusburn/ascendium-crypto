-- Fix the sync function to properly calculate live trading profits and update net_balance
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update each user's interest_earned and net_balance with current trading profits
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
        -- Same calculation for net balance
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 86400)
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0)
  WHERE EXISTS (
    SELECT 1 FROM public.trades 
    WHERE trades.user_id = profiles.id 
    AND trades.status = 'active'
  ) OR profiles.interest_earned != 0 OR profiles.net_balance != COALESCE(profiles.base_balance, 0);
  
  -- Also update the current_profit in trades table for consistency
  UPDATE public.trades 
  SET 
    current_profit = initial_amount * profit_multiplier * 
      (EXTRACT(EPOCH FROM (now() - started_at)) / 86400),
    last_updated = now()
  WHERE status = 'active';
END;
$$;