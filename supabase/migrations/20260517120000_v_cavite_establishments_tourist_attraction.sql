-- Unified establishments view for web/mobile (v_cavite_establishments).
-- Includes LGU places_* tables + admin places + normalized tourist_attractions.
--
-- Verification (run after apply):
--   SELECT count(*) FROM public.v_cavite_establishments;
--   SELECT lgu_slug, count(*) FROM public.v_cavite_establishments GROUP BY 1 ORDER BY 2 DESC;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ensure Alfonso staging exists (some projects dropped this table)
CREATE TABLE IF NOT EXISTS public.places_alfonso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ta_name TEXT NOT NULL,
  type_code TEXT,
  ta_category TEXT,
  ntdp_category TEXT,
  city_mun TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  searchable_text TEXT NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(searchable_text, ''))) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.places_alfonso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read places_alfonso" ON public.places_alfonso;
CREATE POLICY "Public read places_alfonso" ON public.places_alfonso
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.places_alfonso TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) tourist_attractions: stable UUID for app routes (/place/:id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tourist_attractions
  ADD COLUMN IF NOT EXISTS establishment_public_id UUID,
  ADD COLUMN IF NOT EXISTS source_places_alfonso_id UUID,
  ADD COLUMN IF NOT EXISTS category_id BIGINT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS searchable_text TEXT;

UPDATE public.tourist_attractions
SET establishment_public_id = gen_random_uuid()
WHERE establishment_public_id IS NULL;

UPDATE public.tourist_attractions ta
SET establishment_public_id = ta.source_places_alfonso_id
WHERE ta.source_places_alfonso_id IS NOT NULL
  AND ta.establishment_public_id IS DISTINCT FROM ta.source_places_alfonso_id;

ALTER TABLE public.tourist_attractions
  ALTER COLUMN establishment_public_id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tourist_attractions_establishment_public_id_key'
  ) THEN
    ALTER TABLE public.tourist_attractions
      ADD CONSTRAINT tourist_attractions_establishment_public_id_key
      UNIQUE (establishment_public_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) RLS: allow anon/authenticated read on normalized tables (for security_invoker view)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tourist_attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.type_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ntdp_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tourist_attractions" ON public.tourist_attractions;
CREATE POLICY "Public read tourist_attractions" ON public.tourist_attractions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read cities" ON public.cities;
CREATE POLICY "Public read cities" ON public.cities
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read type_codes" ON public.type_codes;
CREATE POLICY "Public read type_codes" ON public.type_codes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read ta_categories" ON public.ta_categories;
CREATE POLICY "Public read ta_categories" ON public.ta_categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read ntdp_categories" ON public.ntdp_categories;
CREATE POLICY "Public read ntdp_categories" ON public.ntdp_categories
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.tourist_attractions TO anon, authenticated;
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.type_codes TO anon, authenticated;
GRANT SELECT ON public.ta_categories TO anon, authenticated;
GRANT SELECT ON public.ntdp_categories TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Recreate v_cavite_establishments
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_cavite_establishments;

CREATE VIEW public.v_cavite_establishments AS
-- Alfonso: raw LGU rows not yet linked to tourist_attractions
SELECT
  p.id,
  p.ta_name AS name,
  p.ta_name,
  p.type_code,
  p.ta_category,
  p.ntdp_category,
  p.city_mun,
  p.address,
  p.latitude,
  p.longitude,
  p.description,
  p.searchable_text,
  p.created_at,
  'alfonso'::text AS lgu_slug
FROM public.places_alfonso p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tourist_attractions ta
  WHERE ta.source_places_alfonso_id = p.id
)
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
  AND coalesce(p.is_published, true) = true
UNION ALL
SELECT
  ta.establishment_public_id AS id,
  ta.ta_name AS name,
  ta.ta_name,
  tc.type_code,
  tac.category_name AS ta_category,
  nc.ntdp_category_name AS ntdp_category,
  c.city_name AS city_mun,
  ta.address,
  ta.latitude::double precision AS latitude,
  ta.longitude::double precision AS longitude,
  ta.description,
  COALESCE(
    NULLIF(trim(ta.searchable_text), ''),
    lower(concat_ws(
      ' ',
      ta.ta_name,
      ta.address,
      c.city_name,
      tc.type_code,
      tac.category_name,
      nc.ntdp_category_name,
      ta.baranggay
    ))
  ) AS searchable_text,
  ta.created_at,
  lower(
    regexp_replace(
      regexp_replace(coalesce(nullif(trim(c.city_name), ''), 'cavite'), '[^a-zA-Z0-9]+', '_', 'g'),
      '(^_+|_+$)',
      '',
      'g'
    )
  ) AS lgu_slug
FROM public.tourist_attractions ta
LEFT JOIN public.cities c ON c.city_id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.type_code_id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.category_id = ta.category_id
LEFT JOIN public.ntdp_categories nc ON nc.ntdp_category_id = ta.ntdp_category_id
WHERE ta.establishment_public_id IS NOT NULL
  AND ta.latitude IS NOT NULL
  AND ta.longitude IS NOT NULL;

ALTER VIEW public.v_cavite_establishments SET (security_invoker = true);
GRANT SELECT ON public.v_cavite_establishments TO anon, authenticated;
