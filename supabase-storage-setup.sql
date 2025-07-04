-- Create a Supabase Storage bucket for photos
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;

-- (Optional) Set up RLS policies for privacy (public, friends, private)
-- Example: Allow users to upload and view their own files
-- You can further customize these policies in the Supabase dashboard

-- Allow authenticated users to upload to the bucket
create policy "Allow upload for authenticated" on storage.objects
  for insert with check (auth.role() = 'authenticated' and bucket_id = 'photos');

-- Allow users to view their own files
create policy "Allow read for owner" on storage.objects
  for select using (auth.uid() = owner and bucket_id = 'photos');

-- (Optional) Allow public read for public photos (if you want public images)
-- You can add a metadata field or use a separate bucket for public images

-- You may need to adjust these policies to match your privacy model
