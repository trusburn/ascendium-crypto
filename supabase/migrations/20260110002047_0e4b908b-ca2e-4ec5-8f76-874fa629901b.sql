-- Drop the existing constraint and add extended version with admin types
ALTER TABLE public.transactions
DROP CONSTRAINT transactions_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check CHECK (
  type IN (
    'deposit',
    'withdrawal',
    'trade',
    'commission',
    'interest',
    'swap',
    'signal_purchase',
    'trade_profit',
    'trade_loss',
    'trade_liquidation',
    'admin_credit',
    'admin_debit'
  )
);