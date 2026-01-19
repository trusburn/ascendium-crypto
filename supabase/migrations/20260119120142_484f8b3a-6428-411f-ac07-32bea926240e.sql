
-- Add missing exit_price and closed_at columns to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS exit_price numeric,
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;
