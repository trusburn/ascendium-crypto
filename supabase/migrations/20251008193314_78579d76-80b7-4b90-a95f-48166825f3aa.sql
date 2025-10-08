-- Update RLS policy to allow public viewing of contact page settings
DROP POLICY IF EXISTS "Public can view display content only" ON admin_settings;

CREATE POLICY "Public can view display content only" 
ON admin_settings 
FOR SELECT 
USING (
  key LIKE 'content_%' 
  OR key LIKE 'color_%' 
  OR key LIKE 'contact_%'
);