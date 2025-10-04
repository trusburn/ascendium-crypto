-- Allow anyone to read admin settings (they're just site content/branding)
CREATE POLICY "Anyone can view admin settings"
ON admin_settings
FOR SELECT
USING (true);

-- Keep the existing admin-only policy for modifications
-- (The existing "Admins only" policy already covers INSERT, UPDATE, DELETE)