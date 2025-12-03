-- Allow admins to insert transactions for any user (needed when stopping trades)
CREATE POLICY "Admins can insert transactions for any user" 
ON public.transactions 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));