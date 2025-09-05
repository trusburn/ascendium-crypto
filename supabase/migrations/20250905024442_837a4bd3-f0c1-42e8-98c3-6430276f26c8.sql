-- Update the sync_trading_profits function to calculate profits hourly instead of daily
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN  
  -- Update all user profiles with current trading profits (calculated hourly for faster growth)
  UPDATE public.profiles 
  SET 
    interest_earned = COALESCE((
      SELECT SUM(
        -- Calculate current profit based on time elapsed since trade started (hourly)
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 3600) -- Convert to hours for faster profits
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
      SELECT SUM(
        -- Same calculation for net balance - trading profits get added to base balance (hourly)
        initial_amount * profit_multiplier * 
        (EXTRACT(EPOCH FROM (now() - started_at)) / 3600) -- Convert to hours for faster profits
      )
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
    ), 0)
  WHERE id IS NOT NULL;
  
  -- Also update the current_profit in trades table for consistency (hourly)
  UPDATE public.trades 
  SET 
    current_profit = initial_amount * profit_multiplier * 
      (EXTRACT(EPOCH FROM (now() - started_at)) / 3600), -- Convert to hours for faster profits
    last_updated = now()
  WHERE status = 'active';
END;
$function$;