-- Add is_frozen column to profiles table for user account freezing/unfreezing
ALTER TABLE public.profiles 
ADD COLUMN is_frozen boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.is_frozen IS 'Whether the user account is frozen (disabled) by admin';