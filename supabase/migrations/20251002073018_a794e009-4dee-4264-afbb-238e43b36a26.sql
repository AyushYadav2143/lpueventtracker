-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user credentials table
CREATE TABLE public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  registration_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin credentials table
CREATE TABLE public.admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only read their own data
CREATE POLICY "Users can view own credentials"
ON public.user_credentials FOR SELECT
USING (id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can view own credentials"
ON public.admin_credentials FOR SELECT
USING (id = (current_setting('app.current_admin_id', true))::uuid);

-- Function to register a new user
CREATE OR REPLACE FUNCTION public.register_user(
  _email TEXT,
  _password TEXT,
  _full_name TEXT,
  _registration_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _existing_user UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO _existing_user FROM public.user_credentials WHERE email = _email;
  
  IF _existing_user IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already exists');
  END IF;
  
  -- Insert new user with hashed password
  INSERT INTO public.user_credentials (email, password_hash, full_name, registration_id)
  VALUES (_email, crypt(_password, gen_salt('bf')), _full_name, _registration_id)
  RETURNING id INTO _user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', _user_id,
    'email', _email,
    'full_name', _full_name
  );
END;
$$;

-- Function to login user
CREATE OR REPLACE FUNCTION public.login_user(
  _email TEXT,
  _password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_record RECORD;
BEGIN
  -- Find user and verify password
  SELECT id, email, full_name, registration_id
  INTO _user_record
  FROM public.user_credentials
  WHERE email = _email AND password_hash = crypt(_password, password_hash);
  
  IF _user_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', _user_record.id,
    'email', _user_record.email,
    'full_name', _user_record.full_name,
    'registration_id', _user_record.registration_id
  );
END;
$$;

-- Function to login admin
CREATE OR REPLACE FUNCTION public.login_admin(
  _email TEXT,
  _password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_record RECORD;
BEGIN
  -- Find admin and verify password
  SELECT id, email, full_name
  INTO _admin_record
  FROM public.admin_credentials
  WHERE email = _email AND password_hash = crypt(_password, password_hash);
  
  IF _admin_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'admin_id', _admin_record.id,
    'email', _admin_record.email,
    'full_name', _admin_record.full_name
  );
END;
$$;

-- Insert a default admin account (password: admin123)
INSERT INTO public.admin_credentials (email, password_hash, full_name)
VALUES ('admin@campusevents.com', crypt('admin123', gen_salt('bf')), 'Admin User')
ON CONFLICT (email) DO NOTHING;