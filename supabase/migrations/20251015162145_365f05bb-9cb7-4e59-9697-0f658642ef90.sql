-- Create storage bucket for shared media (photos, gifs, videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-media', 'shared-media', true);

-- Create RLS policies for public access to shared media
CREATE POLICY "Anyone can view shared media"
ON storage.objects FOR SELECT
USING (bucket_id = 'shared-media');

CREATE POLICY "Anyone can upload shared media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shared-media');

-- Create table to track shared media
CREATE TABLE public.shared_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'photo', 'gif', 'video'
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shared_media table
ALTER TABLE public.shared_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared media records
CREATE POLICY "Anyone can view shared media records"
ON public.shared_media FOR SELECT
USING (true);

-- Anyone can insert shared media records
CREATE POLICY "Anyone can insert shared media records"
ON public.shared_media FOR INSERT
WITH CHECK (true);