-- Create a public storage bucket for course images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- 1. Add image_url column to courses table if it doesn't exist.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Allow authenticated users to upload course images (namespaced by owner_id).
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-images' AND owner_id = auth.uid());

-- 3. Allow anyone to read course images (public bucket).
CREATE POLICY "Public read access for course images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-images');

-- 4. Allow authenticated users to delete their own course images.
CREATE POLICY "Authenticated users can delete their own course images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-images' AND (select auth.uid()) = owner_id);

-- 5. Allow authenticated users to update (overwrite) their own course images.
CREATE POLICY "Authenticated users can update their own course images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-images' AND (select auth.uid()) = owner_id);

