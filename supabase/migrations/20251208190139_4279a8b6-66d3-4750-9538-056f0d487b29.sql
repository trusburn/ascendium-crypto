-- Create a new simple function that directly updates interest_earned with active trade profits
CREATE OR REPLACE FUNCTION public.update_live_interest_earned()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Directly update interest_earned with sum of current_profit from active trades
  -- This runs every time trades are updated
  UPDATE public.profiles p
  SET 
    interest_earned = COALESCE((
      SELECT SUM(GREATEST(t.current_profit, 0))
      FROM public.trades t
      WHERE t.user_id = p.id 
      AND t.status = 'active'
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
      SELECT SUM(GREATEST(t.current_profit, 0))
      FROM public.trades t
      WHERE t.user_id = p.id 
      AND t.status = 'active'
    ), 0)
  WHERE EXISTS (
    SELECT 1 FROM public.trades t 
    WHERE t.user_id = p.id 
    AND t.status = 'active'
  );
END;
$$;