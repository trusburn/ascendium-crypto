-- Add RLS policy to allow authenticated users to view wallet addresses for deposits
CREATE POLICY "Authenticated users can view wallet addresses" 
ON public.admin_settings 
FOR SELECT 
USING (key LIKE 'wallet_%');