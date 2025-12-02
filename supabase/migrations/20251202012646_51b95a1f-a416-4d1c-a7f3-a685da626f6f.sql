-- Allow admins to delete from all user-related tables

-- Profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin(auth.uid()));

-- Deposits
CREATE POLICY "Admins can delete deposits"
ON public.deposits
FOR DELETE
USING (is_admin(auth.uid()));

-- Withdrawals
CREATE POLICY "Admins can delete withdrawals"
ON public.withdrawals
FOR DELETE
USING (is_admin(auth.uid()));

-- Transactions
CREATE POLICY "Admins can delete transactions"
ON public.transactions
FOR DELETE
USING (is_admin(auth.uid()));

-- Trades
CREATE POLICY "Admins can delete trades"
ON public.trades
FOR DELETE
USING (is_admin(auth.uid()));

-- Purchased signals
CREATE POLICY "Admins can delete purchased signals"
ON public.purchased_signals
FOR DELETE
USING (is_admin(auth.uid()));