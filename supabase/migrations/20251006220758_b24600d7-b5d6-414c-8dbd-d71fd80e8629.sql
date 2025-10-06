-- Security Fix: Restrict admin_settings access to protect sensitive configuration data
-- Remove the overly permissive public read policy and replace with secure, granular policies

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "Anyone can view admin settings" ON public.admin_settings;

-- Create admin-only policy for full access to all settings
CREATE POLICY "Admins have full access to admin settings"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create limited public read policy ONLY for display content (content_% and color_% keys)
-- This allows public pages to fetch styling/content while protecting sensitive system settings
CREATE POLICY "Public can view display content only"
ON public.admin_settings
FOR SELECT
TO public
USING (
  key LIKE 'content_%' OR key LIKE 'color_%'
);

-- Add helpful comment explaining the security model
COMMENT ON TABLE public.admin_settings IS 'System configuration table. Admins have full access. Public users can only read display content (content_* and color_* keys) for website rendering. All other settings (financial limits, approval settings, etc.) are admin-only.';