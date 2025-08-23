-- Add image_paths column to store the file paths of uploaded images
ALTER TABLE public.claims 
ADD COLUMN image_paths TEXT[];