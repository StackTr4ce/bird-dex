-- Rollback script for user_profiles changes
-- Run this if you need to undo the user_profiles updates

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Disable RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Optionally remove the email column (uncomment if needed)
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS email;

-- Drop the index
DROP INDEX IF EXISTS user_profiles_email_idx;
