-- Create tradeable assets table for cryptocurrencies and forex
CREATE TABLE IF NOT EXISTS public.tradeable_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'forex')),
  current_price NUMERIC DEFAULT 0,
  api_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for tradeable_assets
ALTER TABLE public.tradeable_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tradeable assets"
ON public.tradeable_assets
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tradeable assets"
ON public.tradeable_assets
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add new columns to trades table for asset-based trading
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.tradeable_assets(id),
ADD COLUMN IF NOT EXISTS entry_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_change_percent NUMERIC DEFAULT 0;

-- Insert some default crypto assets
INSERT INTO public.tradeable_assets (symbol, name, asset_type, api_id, current_price) VALUES
('BTC/USD', 'Bitcoin', 'crypto', 'bitcoin', 50000),
('ETH/USD', 'Ethereum', 'crypto', 'ethereum', 3000),
('BNB/USD', 'Binance Coin', 'crypto', 'binancecoin', 400),
('SOL/USD', 'Solana', 'crypto', 'solana', 100),
('XRP/USD', 'Ripple', 'crypto', 'ripple', 0.60)
ON CONFLICT (symbol) DO NOTHING;

-- Insert some default forex pairs
INSERT INTO public.tradeable_assets (symbol, name, asset_type, current_price) VALUES
('EUR/USD', 'Euro / US Dollar', 'forex', 1.08),
('GBP/USD', 'British Pound / US Dollar', 'forex', 1.27),
('USD/JPY', 'US Dollar / Japanese Yen', 'forex', 149.50),
('USD/CHF', 'US Dollar / Swiss Franc', 'forex', 0.88),
('AUD/USD', 'Australian Dollar / US Dollar', 'forex', 0.66),
('USD/CAD', 'US Dollar / Canadian Dollar', 'forex', 1.36)
ON CONFLICT (symbol) DO NOTHING;

-- Create function to update asset prices and calculate trade profits
CREATE OR REPLACE FUNCTION public.update_asset_based_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update trades with current price changes and calculate profit
  UPDATE public.trades t
  SET 
    price_change_percent = ((t.current_price - t.entry_price) / NULLIF(t.entry_price, 0)) * 100,
    current_profit = CASE 
      WHEN t.trade_type = 'buy' THEN
        -- For buy orders: profit when price goes up
        t.initial_amount * ((t.current_price - t.entry_price) / NULLIF(t.entry_price, 0)) * t.profit_multiplier
      WHEN t.trade_type = 'sell' THEN
        -- For sell orders: profit when price goes down
        t.initial_amount * ((t.entry_price - t.current_price) / NULLIF(t.entry_price, 0)) * t.profit_multiplier
      ELSE 0
    END,
    last_updated = now()
  WHERE t.status = 'active' AND t.asset_id IS NOT NULL;
END;
$$;

-- Update the main sync function to use asset-based profits
CREATE OR REPLACE FUNCTION public.sync_trading_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN  
  -- First update asset-based trade profits
  PERFORM public.update_asset_based_profits();
  
  -- Update all user profiles with current trading profits
  UPDATE public.profiles 
  SET 
    interest_earned = COALESCE((
      SELECT SUM(current_profit)
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
      AND current_profit > 0
    ), 0),
    net_balance = COALESCE(base_balance, 0) + COALESCE((
      SELECT SUM(current_profit)
      FROM public.trades 
      WHERE trades.user_id = profiles.id 
      AND trades.status = 'active'
      AND current_profit > 0
    ), 0)
  WHERE id IS NOT NULL;
END;
$$;

-- Create trigger to update timestamps on asset updates
CREATE TRIGGER update_tradeable_assets_updated_at
BEFORE UPDATE ON public.tradeable_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();