-- Update existing profiles to have a starting balance for testing
UPDATE public.profiles 
SET net_balance = 10000.00 
WHERE net_balance = 0.00 OR net_balance IS NULL;

-- Update the default for new users to have starting balance
ALTER TABLE public.profiles 
ALTER COLUMN net_balance SET DEFAULT 10000.00;