-- Drop the existing constraint
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add updated constraint including 'swap'
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (
  type IN (
    'deposit',
    'withdrawal',
    'trade',
    'commission',
    'interest',
    'swap',
    'signal_purchase'
  )
);