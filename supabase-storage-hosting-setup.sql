-- BirdDex Supabase Storage Setup
-- Run this in your Supabase SQL Editor to set up storage for static hosting

-- Create storage bucket for the web application (if not created automatically)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'birddex-app', 
  'birddex-app', 
  true, 
  10485760, -- 10MB limit per file
  ARRAY[
    'text/html',
    'text/css', 
    'application/javascript',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/x-icon',
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for public read access to the web app files
CREATE POLICY "Public read access for web app" ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'birddex-app');

-- Optional: Create policy for authenticated uploads (for deployment script)
CREATE POLICY "Authenticated users can upload web app files" ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'birddex-app');

-- Optional: Create policy for authenticated updates (for deployment script)  
CREATE POLICY "Authenticated users can update web app files" ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'birddex-app')
WITH CHECK (bucket_id = 'birddex-app');

-- Optional: Create policy for authenticated deletes (for deployment script)
CREATE POLICY "Authenticated users can delete web app files" ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'birddex-app');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'birddex-app';
