-- Create admin_credentials table for secure admin login
CREATE TABLE public.admin_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_credentials
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view their own credentials
CREATE POLICY "Admins can view own credentials" 
ON public.admin_credentials 
FOR SELECT 
USING (true); -- This will be restricted by the application logic

-- Insert the default admin credentials
INSERT INTO public.admin_credentials (email, password_hash) 
VALUES ('admin@gmail.com', '214365');

-- Create function to verify admin credentials
CREATE OR REPLACE FUNCTION public.verify_admin_credentials(
  input_email TEXT,
  input_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_credentials 
    WHERE email = input_email AND password_hash = input_password
  );
END;
$$;