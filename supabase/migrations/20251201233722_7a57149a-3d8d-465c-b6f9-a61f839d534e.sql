-- Create enum for trading engine types
DO $$ BEGIN
  CREATE TYPE trading_engine_type AS ENUM ('default', 'rising', 'general');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create table for user trading engine preferences
CREATE TABLE IF NOT EXISTS public.user_trading_engines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  engine_type trading_engine_type NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_trading_engines ENABLE ROW LEVEL SECURITY;

-- Users can view their own engine setting
CREATE POLICY "Users can view their own engine setting"
ON public.user_trading_engines
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all engine settings
CREATE POLICY "Admins can view all engine settings"
ON public.user_trading_engines
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert engine settings
CREATE POLICY "Admins can insert engine settings"
ON public.user_trading_engines
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update engine settings
CREATE POLICY "Admins can update engine settings"
ON public.user_trading_engines
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete engine settings
CREATE POLICY "Admins can delete engine settings"
ON public.user_trading_engines
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_user_trading_engines_updated_at
BEFORE UPDATE ON public.user_trading_engines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();