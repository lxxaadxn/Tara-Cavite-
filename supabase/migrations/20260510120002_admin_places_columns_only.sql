-- Run this BEFORE 20260510120001_v_cavite_establishments_view_fix.sql
-- if Step 2 failed early or your places table is missing admin columns.

ALTER TABLE public.places ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS social_twitter TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS searchable_text TEXT DEFAULT '';
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS lgu_slug TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS city_mun TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS type_code TEXT;
