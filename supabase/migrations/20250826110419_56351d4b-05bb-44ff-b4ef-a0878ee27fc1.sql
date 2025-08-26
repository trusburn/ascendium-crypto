-- Update interest_earned for all users based on their active trades
-- This function will be called periodically to sync trading profits with interest_earned
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update interest_earned based on current trading profits
  UPDATE public.profiles 
  SET interest_earned = COALESCE((
    SELECT SUM(
      initial_amount * profit_multiplier * 
      (EXTRACT(EPOCH FROM (now() - started_at)) / 3600 / 24)
    )
    FROM public.trades 
    WHERE trades.user_id = profiles.id 
    AND trades.status = 'active'
  ), 0);
END;
$$;