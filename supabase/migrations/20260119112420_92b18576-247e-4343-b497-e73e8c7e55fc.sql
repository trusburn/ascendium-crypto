-- Drop the existing check constraint on transactions.type
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add a new check constraint that includes all required transaction types
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (
  type IN (
    'deposit',
    'withdrawal',
    'trade_open',
    'trade_close',
    'trade_profit',
    'trade_loss',
    'interest',
    'commission',
    'admin_adjustment',
    'admin_credit',
    'admin_debit',
    'signal_purchase',
    'swap',
    'refund'
  )
);