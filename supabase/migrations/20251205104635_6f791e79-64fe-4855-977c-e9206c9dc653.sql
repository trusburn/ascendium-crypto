-- Add source column to withdrawals table to track withdrawal source
ALTER TABLE public.withdrawals 
ADD COLUMN source text NOT NULL DEFAULT 'net_balance';

-- Add comment for clarity
COMMENT ON COLUMN public.withdrawals.source IS 'Source of withdrawal: net_balance, interest_earned, or commissions';