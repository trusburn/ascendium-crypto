-- Crypto Investment Platform Database Schema
-- This file contains the complete database structure for deployment

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT,
    net_balance NUMERIC DEFAULT 0.00,
    total_invested NUMERIC DEFAULT 0.00,
    interest_earned NUMERIC DEFAULT 0.00,
    commissions NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    crypto_type TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deposits
CREATE POLICY "Users can view their own deposits" ON public.deposits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits" ON public.deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    crypto_type TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for withdrawals
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals" ON public.withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create signals table
CREATE TABLE IF NOT EXISTS public.signals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0.00,
    profit_multiplier NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on signals
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for signals (public read access)
CREATE POLICY "Anyone can view signals" ON public.signals
    FOR SELECT USING (true);

-- Create functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample signals data
INSERT INTO public.signals (name, description, price, profit_multiplier) VALUES
('Starter Signal', 'Perfect for beginners starting their crypto journey', 99.00, 1.2),
('Bronze Signal', 'Enhanced trading signals with basic market insights', 299.00, 1.5),
('Silver Signal', 'Advanced analytics with higher profit potential', 599.00, 2.0),
('Gold Signal', 'Premium signals with exclusive market intelligence', 999.00, 2.5),
('Platinum Signal', 'Elite trading package with priority support', 1999.00, 3.0),
('Diamond Signal', 'Ultimate trading experience with maximum returns', 3999.00, 4.0),
('Elite Signal', 'Exclusive access to the most profitable opportunities', 7999.00, 5.0)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.profiles IS 'User profile information and balances';
COMMENT ON TABLE public.deposits IS 'User deposit requests and approvals';
COMMENT ON TABLE public.withdrawals IS 'User withdrawal requests and approvals';
COMMENT ON TABLE public.transactions IS 'All user transactions history';
COMMENT ON TABLE public.signals IS 'Trading signal packages available for purchase';