-- Create storage bucket for event images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can upload event images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can view event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Drop user-related tables
DROP TABLE IF EXISTS saved_events CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS admin_credentials CASCADE;

-- Drop the trigger and function for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop old admin functions
DROP FUNCTION IF EXISTS public.verify_admin_credentials(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_events(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_event_status(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_event(uuid, text, text) CASCADE;

-- Drop the created_by column with CASCADE to remove dependent policies
ALTER TABLE events DROP COLUMN IF EXISTS created_by CASCADE;

-- Add new columns for submitter information
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitter_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitter_email TEXT;

-- Drop existing RLS policies on events if they exist
DROP POLICY IF EXISTS "Anyone can view approved events" ON events;
DROP POLICY IF EXISTS "Anyone can insert events" ON events;

-- Create simple RLS policies
CREATE POLICY "Anyone can view approved events"
ON events
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Anyone can insert events"
ON events
FOR INSERT
WITH CHECK (true);

-- Create simplified admin functions
CREATE OR REPLACE FUNCTION public.admin_list_events(_status text)
RETURNS SETOF events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.events WHERE status = _status;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_event_status(_event_id uuid, _new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events SET status = _new_status WHERE id = _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_event(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.events WHERE id = _event_id;
END;
$$;