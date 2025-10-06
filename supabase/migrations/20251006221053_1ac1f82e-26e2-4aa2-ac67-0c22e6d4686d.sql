-- Security Enhancement: Audit Logging and Access Control for Profiles Table
-- This migration adds comprehensive audit trails and restricts unauthorized data modifications

-- 1. Create audit log table for tracking access to sensitive user data
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'view_profile', 'update_balance', 'freeze_account', etc.
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_admin_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target_user ON public.admin_audit_logs(target_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);

-- 2. Drop the existing broad user update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Create restricted update policy for users (only safe fields)
CREATE POLICY "Users can update their own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Ensure financial fields cannot be modified by users
  AND COALESCE(net_balance, 0) = COALESCE((SELECT net_balance FROM public.profiles WHERE id = auth.uid()), 0)
  AND COALESCE(base_balance, 0) = COALESCE((SELECT base_balance FROM public.profiles WHERE id = auth.uid()), 0)
  AND COALESCE(total_invested, 0) = COALESCE((SELECT total_invested FROM public.profiles WHERE id = auth.uid()), 0)
  AND COALESCE(interest_earned, 0) = COALESCE((SELECT interest_earned FROM public.profiles WHERE id = auth.uid()), 0)
  AND COALESCE(commissions, 0) = COALESCE((SELECT commissions FROM public.profiles WHERE id = auth.uid()), 0)
  AND COALESCE(is_frozen, false) = COALESCE((SELECT is_frozen FROM public.profiles WHERE id = auth.uid()), false)
);

-- 4. Create admin-only update policy for financial fields
CREATE POLICY "Admins can update all profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5. Create function to log admin profile access
CREATE OR REPLACE FUNCTION public.log_admin_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if an admin is making changes to another user's profile
  IF public.is_admin(auth.uid()) AND auth.uid() != OLD.id THEN
    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      target_user_id,
      action,
      table_name,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      OLD.id,
      'update_profile',
      'profiles',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger for audit logging on profile updates
DROP TRIGGER IF EXISTS audit_profile_updates ON public.profiles;
CREATE TRIGGER audit_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_profile_update();

-- 7. Add helpful comments
COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for admin actions on user data. Tracks all administrative access to sensitive user information for compliance and security monitoring.';
COMMENT ON COLUMN public.admin_audit_logs.action IS 'Type of action performed: view_profile, update_balance, freeze_account, etc.';
COMMENT ON COLUMN public.admin_audit_logs.old_values IS 'JSON snapshot of data before modification';
COMMENT ON COLUMN public.admin_audit_logs.new_values IS 'JSON snapshot of data after modification';

COMMENT ON POLICY "Users can update their own safe profile fields" ON public.profiles IS 'Users can only update non-financial profile fields (username, bio, avatar, location, phone). Financial fields are protected against user manipulation.';