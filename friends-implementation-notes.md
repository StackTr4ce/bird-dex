# Friends Feature Implementation Notes

## Current Status
The Friends page UI has been implemented with the following features:
- Add friend form (currently shows a limitation message)
- Display friend requests (received)
- Display pending requests (sent)
- Display current friends list
- Accept/decline friend requests
- Remove friends

## Database Schema Requirements

To make the friend system fully functional, you'll need to add a user profiles table:

```sql
-- Create a profiles table to store user display information
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  username text UNIQUE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create a function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Implementation Updates Needed

Once the profiles table is created, update the FriendsPage.tsx:

1. Replace the getUserEmail function to query the profiles table:
```typescript
const getUserEmail = async (userId: string): Promise<string> => {
  const { data } = await supabase
    .from('profiles')
    .select('email, username, display_name')
    .eq('id', userId)
    .single();
  return data?.display_name || data?.username || data?.email || 'Unknown user';
};
```

2. Update the sendFriendRequest function to search for users by email/username:
```typescript
// Find user by email or username
const { data: targetUser, error: userError } = await supabase
  .from('profiles')
  .select('id, email, username')
  .or(`email.eq.${friendEmail.trim()},username.eq.${friendEmail.trim()}`)
  .maybeSingle();
```

3. Remove the limitation alert from the form.

## Additional Features to Consider

- User search/browse functionality
- Username-based friend requests (not just email)
- Friend suggestions
- Bulk friend import
- Privacy settings for friend visibility
- Notification system for friend requests
