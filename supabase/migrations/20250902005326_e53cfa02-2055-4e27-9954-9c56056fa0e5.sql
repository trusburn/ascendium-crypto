-- Add base_balance column to track admin adjustments separately from trading profits
ALTER TABLE public.profiles 
ADD COLUMN base_balance numeric DEFAULT 10000.00;

-- Update existing profiles to set base_balance to current net_balance minus any trading profits
UPDATE public.profiles 
SET base_balance = COALESCE(net_balance, 0) - COALESCE(interest_earned, 0);

-- Update the sync function to properly sync trading profits to both interest_earned and net_balance
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate trading profits and update both interest_earned and net_balance
  UPDATE public.profiles 
  SET 
    interest_earned = COALESCE((
      SELECT SUM(
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 3600 / 24)
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
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