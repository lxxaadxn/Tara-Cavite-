-- Admin CMS bootstrap (no LGU tables / no v_cavite_establishments UNION).
-- Run this if cavitour_admin_allowlist does not exist yet.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- 1) Allowlist + admin check function
CREATE TABLE IF NOT EXISTS public.cavitour_admin_allowlist (
  email TEXT PRIMARY KEY
);

ALTER TABLE public.cavitour_admin_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct allowlist access" ON public.cavitour_admin_allowlist;
CREATE POLICY "No direct allowlist access"
  ON public.cavitour_admin_allowlist FOR ALL
  USING (false)
  WITH CHECK (false);

INSERT INTO public.cavitour_admin_allowlist (email)
VALUES ('forcapstone111@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_cavitour_session_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cavitour_admin_allowlist a
    WHERE lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_cavitour_session_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cavitour_session_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cavitour_session_admin() TO anon;

-- 2) places columns (admin form fields)
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

-- Ensure RLS on places (required for admin policies)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view places" ON public.places;
CREATE POLICY "Anyone can view places"
  ON public.places FOR SELECT
  USING (true);

-- 3) Admin write policies on places
DROP POLICY IF EXISTS "Cavitour admins insert places" ON public.places;
CREATE POLICY "Cavitour admins insert places"
  ON public.places FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins update places" ON public.places;
CREATE POLICY "Cavitour admins update places"
  ON public.places FOR UPDATE
  TO authenticated
  USING (public.is_cavitour_session_admin())
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins delete places" ON public.places;
CREATE POLICY "Cavitour admins delete places"
  ON public.places FOR DELETE
  TO authenticated
  USING (public.is_cavitour_session_admin());

-- 4) Storage bucket place-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'place-images',
  'place-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read place-images" ON storage.objects;
CREATE POLICY "Public read place-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'place-images');

DROP POLICY IF EXISTS "Admins upload place-images" ON storage.objects;
CREATE POLICY "Admins upload place-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-images'
    AND public.is_cavitour_session_admin()
  );

DROP POLICY IF EXISTS "Admins update place-images" ON storage.objects;
CREATE POLICY "Admins update place-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'place-images' AND public.is_cavitour_session_admin())
  WITH CHECK (bucket_id = 'place-images' AND public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Admins delete place-images" ON storage.objects;
CREATE POLICY "Admins delete place-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'place-images' AND public.is_cavitour_session_admin());
