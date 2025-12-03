-- Allow admins to update any user's trades (e.g., to stop them)
CREATE POLICY "Admins can update trades"
ON public.trades
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));