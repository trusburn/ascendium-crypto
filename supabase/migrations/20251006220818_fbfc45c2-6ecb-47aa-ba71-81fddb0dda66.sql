-- Add policy for authenticated users to read financial limits (needed for deposit/withdrawal pages)
-- This allows regular users to see min/max limits without exposing sensitive admin settings

CREATE POLICY "Authenticated users can view financial limits"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (
  key IN ('min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal', 'platform_fee')
);