-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate register_user function with proper schema references
CREATE OR REPLACE FUNCTION public.register_user(_email text, _password text, _full_name text, _registration_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  VALUES (_email, extensions.crypt(_password, extensions.gen_salt('bf')), _full_name, _registration_id)
  RETURNING id INTO _user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', _user_id,
    'email', _email,
    'full_name', _full_name
  );
END;
$$;

-- Recreate login_user function with proper schema references
CREATE OR REPLACE FUNCTION public.login_user(_email text, _password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _user_record RECORD;
BEGIN
  -- Find user and verify password
  SELECT id, email, full_name, registration_id
  INTO _user_record
  FROM public.user_credentials
  WHERE email = _email AND password_hash = extensions.crypt(_password, password_hash);
  
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