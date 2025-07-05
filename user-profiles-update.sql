-- Update user_profiles table to support friend lookup by email
-- This adds the email field and creates a trigger to auto-populate it from auth.users

-- Temporarily disable RLS for setup
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Add email column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- Create unique index on email for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles(email);

-- Create a function to automatically update user_profiles when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, display_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = new.email,
    display_name = COALESCE(user_profiles.display_name, new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile for %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a user is created or updated
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Backfill existing users (run this once to populate email for existing users)
INSERT INTO user_profiles (user_id, email, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(user_profiles.display_name, EXCLUDED.display_name);

-- Create RLS policies for user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Users can view all profiles (needed for friend lookup)
CREATE POLICY "Users can view all profiles" ON user_profiles
FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);
