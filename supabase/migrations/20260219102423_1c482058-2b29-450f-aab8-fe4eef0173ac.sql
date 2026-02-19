
-- Create storage bucket for setup media attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('setup-media', 'setup-media', true);

-- Allow authenticated users to upload setup media
CREATE POLICY "Authenticated users can upload setup media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'setup-media' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update setup media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'setup-media' AND auth.uid() IS NOT NULL);

-- Allow public read access to setup media
CREATE POLICY "Anyone can view setup media"
ON storage.objects FOR SELECT
USING (bucket_id = 'setup-media');

-- Allow authenticated users to delete setup media
CREATE POLICY "Authenticated users can delete setup media"
ON storage.objects FOR DELETE
USING (bucket_id = 'setup-media' AND auth.uid() IS NOT NULL);
