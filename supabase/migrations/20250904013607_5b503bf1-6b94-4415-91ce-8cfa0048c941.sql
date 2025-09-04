-- Create the default admin user with credentials: paneladmin@gmail.com / paneladmin1010
-- This inserts the user directly into auth.users and creates the admin role

-- First create user profile for the admin
INSERT INTO public.profiles (id, username, net_balance, base_balance, total_invested, interest_earned, commissions) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Panel Admin',
  0.00,
  0.00,
  0.00,
  0.00,
  0.00
) ON CONFLICT (id) DO NOTHING;

-- Create admin role for the default admin
INSERT INTO public.user_roles (user_id, role) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin'
) ON CONFLICT (user_id, role) DO NOTHING;