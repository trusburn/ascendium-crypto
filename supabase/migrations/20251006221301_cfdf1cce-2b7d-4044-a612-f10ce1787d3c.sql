-- Security Fix: Restrict user_roles access to prevent admin enumeration attacks
-- Remove public read access and implement proper role-based access control

-- 1. Remove the dangerous public read policy
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- 2. Create restricted policy for authenticated users to view ONLY their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. The existing "Admins manage roles" policy already allows admins to view/manage all roles
-- So we don't need to add another admin policy

-- 4. Security Fix: Restrict audit log insertions to prevent unauthorized logging
-- The current "System can insert audit logs" policy is too permissive (WITH CHECK: true)
-- Update it to only allow insertions when the admin_user_id matches the authenticated user
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Authenticated users can insert their own audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id);

-- 5. Add helpful comments explaining the security model
COMMENT ON POLICY "Users can view their own role" ON public.user_roles IS 'Users can only query their own role to prevent admin enumeration attacks. Admins can view all roles via the "Admins manage roles" policy.';

COMMENT ON TABLE public.user_roles IS 'User role assignments. Critical security table - users can only see their own role to prevent admin account enumeration. Admins have full access for user management.';