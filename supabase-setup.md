# Supabase Setup for BirdDex

Follow these steps to set up Supabase for BirdDex. Run the SQL and CLI commands in your Supabase project as needed.

## 1. Create Tables

### Users (Supabase Auth handles user accounts)

### Bird Species
```sql
CREATE TABLE species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);
```

### Photos
```sql
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id uuid REFERENCES species(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_top boolean DEFAULT false,
  privacy text NOT NULL CHECK (privacy IN ('public', 'friends', 'private')),
  created_at timestamptz DEFAULT now()
);

-- Enforce only one top photo per user/species with a partial unique index
CREATE UNIQUE INDEX one_top_per_species_per_user ON photos(user_id, species_id) WHERE is_top;
```

### Friendships
```sql
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester, addressee)
);
```

### Comments
```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Quests
```sql
CREATE TABLE quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species_id uuid REFERENCES species(id),
  participation_award_url text,
  top10_award_url text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL
);
```

### Quest Entries
```sql
CREATE TABLE quest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (quest_id, user_id)
);
```

### Quest Votes
```sql
CREATE TABLE quest_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES quest_entries(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (quest_id, voter_id)
);
```

## 2. Enable Google Auth
- In Supabase dashboard, go to Authentication > Providers > Google and enable it.

## 3. Storage Buckets
- (Optional) You may use Supabase Storage for non-photo assets (e.g., award images).

---

**Run these SQL statements in the Supabase SQL editor.**

```sql
-- Insert default species for BirdDex
INSERT INTO species (id, name) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'American Pelican'),
  ('c2b3a4d5-f6e7-8901-bcda-fe2345678901', 'Northern Cardinal')
ON CONFLICT (id) DO NOTHING;
```
