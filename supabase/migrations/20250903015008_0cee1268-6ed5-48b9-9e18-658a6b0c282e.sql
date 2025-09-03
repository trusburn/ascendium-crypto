-- Clean setup for admin system
-- Reset balance defaults
UPDATE public.profiles SET net_balance = 0.00, base_balance = 0.00 WHERE net_balance IS NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN net_balance SET DEFAULT 0.00;
ALTER TABLE public.profiles ALTER COLUMN base_balance SET DEFAULT 0.00;

-- Create simple user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Simple admin check function
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = COALESCE(check_user_id, auth.uid()) AND role = 'admin'
  );
$$;

-- Basic RLS policies
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());

-- Admin access to other tables
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin() OR auth.uid() = id);

-- Create admin settings table
DROP TABLE IF EXISTS public.admin_settings CASCADE;
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON public.admin_settings FOR ALL USING (public.is_admin());