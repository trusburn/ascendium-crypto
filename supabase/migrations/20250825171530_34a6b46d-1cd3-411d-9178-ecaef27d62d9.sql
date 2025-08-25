-- Create purchased_signals table to track user signal purchases
CREATE TABLE public.purchased_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  signal_id UUID NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  price_paid NUMERIC NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Create trades table to track active trades and profit growth
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  signal_id UUID NOT NULL,
  purchased_signal_id UUID NOT NULL,
  trade_type TEXT NOT NULL, -- 'buy' or 'sell'
  initial_amount NUMERIC NOT NULL DEFAULT 0.00,
  current_profit NUMERIC NOT NULL DEFAULT 0.00,
  profit_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.purchased_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchased_signals
CREATE POLICY "Users can view their own purchased signals" 
ON public.purchased_signals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchased signals" 
ON public.purchased_signals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for trades
CREATE POLICY "Users can view their own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update trade profits automatically
CREATE OR REPLACE FUNCTION public.update_trade_profits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.trades 
  SET 
    current_profit = initial_amount * profit_multiplier * 
      (EXTRACT(EPOCH FROM (now() - started_at)) / 3600), -- hourly growth
    last_updated = now()
  WHERE status = 'active';
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();