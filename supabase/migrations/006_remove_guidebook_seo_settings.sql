-- Remove legacy SEO settings from guest-facing guidebooks.

UPDATE public.guidebooks
SET settings = settings - 'seo_title' - 'seo_description' - 'og_image_url'
WHERE settings ?| ARRAY['seo_title', 'seo_description', 'og_image_url'];
