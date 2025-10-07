-- Fix critical security issue: deposits table publicly readable
-- Root cause: is_admin() function returns TRUE for unauthenticated users

-- Step 1: Fix is_admin() function to explicitly reject unauthenticated users
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  -- CRITICAL FIX: Explicitly return FALSE if no authenticated user
  -- This prevents unauthenticated access to admin-protected data
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has admin role
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = target_user_id 
    AND role = 'admin'
  );
END;
$$;

-- Step 2: Remove redundant policy on deposits (we have two SELECT policies)
-- Keep only the specific policies for users and admins
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;

-- Step 3: Create a clear admin-only policy for viewing all deposits
CREATE POLICY "Admins can view all deposits" 
ON public.deposits 
FOR SELECT 
USING (
  -- Explicitly check that user is authenticated AND is an admin
  auth.uid() IS NOT NULL AND is_admin(auth.uid())
);

-- Step 4: Ensure the user policy requires authentication
DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposits;

CREATE POLICY "Users can view their own deposits" 
ON public.deposits 
FOR SELECT 
USING (
  -- Explicitly require authentication and match user_id
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Step 5: Fix the same issue on withdrawals table
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;

CREATE POLICY "Admins can view all withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;

CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Step 6: Fix profiles table public exposure
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND auth.uid() = id
);