-- Admin-curated destinations in public.places (source_slug prefix admin:)
-- + RLS for allowlisted JWT emails + union into v_cavite_establishments
-- + Storage bucket place-images for gallery uploads

-- 1) Who may mutate places / storage (JWT email must match a row here)
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

-- 2) Extra columns on places (idempotent)
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

-- 3) RLS: admins may insert/update/delete any row in places (single trusted admin app)
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

-- 4) Storage bucket for destination images
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

-- 5) Recreate unified establishments view: LGU tables + admin-curated places
DROP VIEW IF EXISTS public.v_cavite_establishments;

CREATE VIEW public.v_cavite_establishments AS
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'alfonso'::text AS lgu_slug FROM public.places_alfonso
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'amadeo'::text AS lgu_slug FROM public.places_amadeo
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'bacoor_city'::text AS lgu_slug FROM public.places_bacoor_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'carmona_city'::text AS lgu_slug FROM public.places_carmona_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'cavite_city'::text AS lgu_slug FROM public.places_cavite_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'dasmarinas_city'::text AS lgu_slug FROM public.places_dasmarinas_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'general_mariano_alvarez'::text AS lgu_slug FROM public.places_general_mariano_alvarez
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'general_trias_city'::text AS lgu_slug FROM public.places_general_trias_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'imus_city'::text AS lgu_slug FROM public.places_imus_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'indang'::text AS lgu_slug FROM public.places_indang
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'magallanes'::text AS lgu_slug FROM public.places_magallanes
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'mendez_nunez'::text AS lgu_slug FROM public.places_mendez_nunez
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'noveleta'::text AS lgu_slug FROM public.places_noveleta
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'silang'::text AS lgu_slug FROM public.places_silang
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'tagaytay_city'::text AS lgu_slug FROM public.places_tagaytay_city
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'tanza'::text AS lgu_slug FROM public.places_tanza
UNION ALL
SELECT id, ta_name AS name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, 'trece_martires_city'::text AS lgu_slug FROM public.places_trece_martires_city
UNION ALL
SELECT
  p.id,
  p.name,
  p.name AS ta_name,
  COALESCE(NULLIF(trim(p.type_code), ''), 'admin') AS type_code,
  COALESCE(NULLIF(trim(p.type), ''), NULLIF(trim(p.ntdp_category), ''), 'Destination') AS ta_category,
  p.ntdp_category,
  p.city_mun,
  p.address,
  p.latitude::double precision,
  p.longitude::double precision,
  p.description,
  COALESCE(
    NULLIF(trim(p.searchable_text), ''),
    lower(concat_ws(' ', p.name, p.address, p.city_mun, p.description, p.ntdp_category, p.type))
  ) AS searchable_text,
  p.created_at,
  COALESCE(NULLIF(trim(p.lgu_slug), ''), 'admin') AS lgu_slug
FROM public.places p
WHERE p.source_slug LIKE 'admin:%'
  AND p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL
  AND coalesce(p.is_published, true) = true;

ALTER VIEW public.v_cavite_establishments SET (security_invoker = true);
GRANT SELECT ON public.v_cavite_establishments TO anon, authenticated;
