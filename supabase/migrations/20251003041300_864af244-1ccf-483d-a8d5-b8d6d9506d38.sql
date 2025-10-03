-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing admin_credentials table since we'll use Supabase Auth for admins
DROP TABLE IF EXISTS public.admin_credentials CASCADE;

-- Drop the old admin login function
DROP FUNCTION IF EXISTS public.login_admin(text, text);

-- Keep user_credentials table for regular users
-- The register_user and login_user functions will now work with pgcrypto enabled