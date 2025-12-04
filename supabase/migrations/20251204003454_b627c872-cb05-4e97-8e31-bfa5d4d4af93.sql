-- Drop the incorrect trigger that references non-existent updated_at column
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;

-- Create a correct function for trades table that uses last_updated
CREATE OR REPLACE FUNCTION public.update_trades_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

-- Create the correct trigger
CREATE TRIGGER update_trades_last_updated
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trades_last_updated();