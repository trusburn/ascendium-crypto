-- Add source_balance column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS source_balance text DEFAULT 'usdt_balance';