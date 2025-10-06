-- Security Fix: Ensure audit log integrity by removing user INSERT access
-- Audit logs should ONLY be written by database triggers and admin functions, never by users directly

-- 1. Remove the overly permissive INSERT policy that allowed any authenticated user to insert logs
DROP POLICY IF EXISTS "Authenticated users can insert their own audit logs" ON public.admin_audit_logs;

-- 2. DO NOT create a replacement INSERT policy
-- The database trigger log_admin_profile_update() runs with SECURITY DEFINER, which bypasses RLS
-- This ensures only server-side triggers can write audit logs, maintaining integrity

-- 3. Add a comment explaining why there's no INSERT policy
COMMENT ON TABLE public.admin_audit_logs IS 
'Audit trail for admin actions on user data. Critical security table: NO user-facing INSERT policies exist to prevent audit log tampering. Only database triggers with SECURITY DEFINER can write to this table. Admins can read logs for investigation and compliance.';

-- 4. Verify the trigger function still has SECURITY DEFINER (it should from previous migration)
-- If needed, we can recreate it to ensure it's set correctly
CREATE OR REPLACE FUNCTION public.log_admin_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Critical: allows bypass of RLS to insert audit logs
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

COMMENT ON FUNCTION public.log_admin_profile_update() IS 
'Trigger function to automatically log admin modifications to user profiles. Runs with SECURITY DEFINER to bypass RLS and ensure audit logs can be written. Only logs when admins modify other users data.';