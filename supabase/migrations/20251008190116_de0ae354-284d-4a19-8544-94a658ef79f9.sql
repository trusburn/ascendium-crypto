-- Enable realtime for admin_settings table so changes are broadcast instantly
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;