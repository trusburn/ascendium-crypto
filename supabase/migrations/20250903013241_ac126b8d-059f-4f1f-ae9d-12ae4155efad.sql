-- Let's create a sample active trade to test the system
-- This will create a trade that should generate profit immediately

-- First, let's ensure there's a signal to use
INSERT INTO public.signals (id, name, description, profit_multiplier, price) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Test Signal',
  'A test signal for demonstrating live profits',
  2.5,
  99.99
) ON CONFLICT (id) DO NOTHING;

-- Add it to purchased signals for testing (you can modify user_id as needed)
INSERT INTO public.purchased_signals (user_id, signal_id, price_paid, status)
SELECT 
  id as user_id,
  '550e8400-e29b-41d4-a716-446655440000'::uuid as signal_id,
  99.99 as price_paid,
  'active' as status
FROM public.profiles 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create a test trade that started 1 hour ago (so it should show some profit)
INSERT INTO public.trades (
  user_id, 
  signal_id, 
  purchased_signal_id,
  trade_type, 
  initial_amount, 
  profit_multiplier,
  started_at,
  status
)
SELECT 
  p.id as user_id,
  '550e8400-e29b-41d4-a716-446655440000'::uuid as signal_id,
  ps.id as purchased_signal_id,
  'buy' as trade_type,
  1000.00 as initial_amount,
  2.5 as profit_multiplier,
  now() - interval '1 hour' as started_at,
  'active' as status
FROM public.profiles p
JOIN public.purchased_signals ps ON ps.user_id = p.id
WHERE ps.signal_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
LIMIT 1
ON CONFLICT DO NOTHING;