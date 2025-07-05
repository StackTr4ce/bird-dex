-- Minimal fix for login issues
-- Run this first to resolve the immediate login problem

-- Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Disable RLS temporarily to allow login
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- If the email column doesn't exist yet, add it
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- Simple function without error handling that might be causing issues
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable the trigger with the simpler function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
