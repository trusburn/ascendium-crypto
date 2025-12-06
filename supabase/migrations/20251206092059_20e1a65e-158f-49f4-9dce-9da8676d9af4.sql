-- Fix sync_trading_profits to not overwrite interest_earned
-- interest_earned should only be updated when trades stop (via stop_all_user_trades)
-- During active trading, only update net_balance to reflect current profits
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN  
  -- First update asset-based trade profits
  PERFORM public.update_asset_based_profits();
  
  -- Update all user profiles with current trading profits
  -- DO NOT overwrite interest_earned - it accumulates from stopped trades only
  -- net_balance = base_balance + interest_earned (accumulated) + active trade profits
  UPDATE public.profiles 
  SET 
    net_balance = COALESCE(base_balance, 0) + COALESCE(interest_earned, 0) + COALESCE((
      SELECT SUM(current_profit)
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
      AND current_profit > 0
    ), 0)
  WHERE id IS NOT NULL;
END;
$function$;