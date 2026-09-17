-- Switch app catalog to normalized public.tourist_attractions.
-- Adds app UUID + image columns, backfills from tourist_attracted, remounts FKs,
-- and exposes a flat read view for web/mobile.

-- 1) App columns on normalized table
ALTER TABLE public.tourist_attractions
  ADD COLUMN IF NOT EXISTS establishment_public_id UUID,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS searchable_text TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source_slug TEXT,
  ADD COLUMN IF NOT EXISTS hours TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.tourist_attractions
SET establishment_public_id = gen_random_uuid()
WHERE establishment_public_id IS NULL;

-- Prefer stable UUIDs already used by apps (tourist_attracted / places lineage)
UPDATE public.tourist_attractions ta
SET establishment_public_id = d.establishment_public_id
FROM public.tourist_attracted d
WHERE lower(trim(ta.ta_name)) = lower(trim(d.ta_name))
  AND d.establishment_public_id IS NOT NULL;

ALTER TABLE public.tourist_attractions
  ALTER COLUMN establishment_public_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN establishment_public_id SET NOT NULL;

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

CREATE UNIQUE INDEX IF NOT EXISTS tourist_attractions_source_slug_uidx
  ON public.tourist_attractions (source_slug)
  WHERE source_slug IS NOT NULL;

-- 2) Copy Storage image URLs from tourist_attracted by name
UPDATE public.tourist_attractions ta
SET
  picture = COALESCE(NULLIF(trim(ta.picture), ''), d.picture),
  gallery_urls = CASE
    WHEN ta.gallery_urls IS NOT NULL AND cardinality(ta.gallery_urls) > 0 THEN ta.gallery_urls
    ELSE COALESCE(d.gallery_urls, ARRAY[]::TEXT[])
  END,
  hours = COALESCE(ta.hours, d.hours),
  searchable_text = COALESCE(ta.searchable_text, d.searchable_text),
  barangay = COALESCE(ta.barangay, d.barangay),
  source_slug = COALESCE(ta.source_slug, d.source_slug),
  is_published = COALESCE(ta.is_published, d.is_published, TRUE),
  updated_at = NOW()
FROM public.tourist_attracted d
WHERE lower(trim(ta.ta_name)) = lower(trim(d.ta_name));

-- 3) Insert tourist_attracted rows missing from tourist_attractions (resolve FKs)
WITH defaults AS (
  SELECT
    (SELECT category_id FROM public.ta_categories ORDER BY category_id ASC LIMIT 1) AS category_id,
    (SELECT type_code_id FROM public.type_codes ORDER BY type_code_id ASC LIMIT 1) AS type_code_id,
    (SELECT ntdp_category_id FROM public.ntdp_categories ORDER BY ntdp_category_id ASC LIMIT 1) AS ntdp_category_id
),
missing AS (
  SELECT d.*
  FROM public.tourist_attracted d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tourist_attractions ta
    WHERE lower(trim(ta.ta_name)) = lower(trim(d.ta_name))
  )
  AND d.latitude IS NOT NULL
  AND d.longitude IS NOT NULL
)
INSERT INTO public.tourist_attractions (
  ta_name,
  type_code_id,
  ta_categories_id,
  ntdp_category_id,
  city_id,
  picture,
  gallery_urls,
  latitude,
  longitude,
  address,
  description,
  establishment_public_id,
  searchable_text,
  is_published,
  source_slug,
  hours,
  barangay,
  created_at,
  updated_at
)
SELECT
  m.ta_name,
  COALESCE(
    (
      SELECT tc.type_code_id
      FROM public.type_codes tc
      WHERE lower(trim(tc.type_code)) = lower(trim(m.type_code))
      LIMIT 1
    ),
    def.type_code_id
  ),
  COALESCE(
    (
      SELECT tac.category_id
      FROM public.ta_categories tac
      WHERE lower(trim(tac.category_name)) = lower(trim(m.type))
      LIMIT 1
    ),
    def.category_id
  ),
  COALESCE(
    (
      SELECT nc.ntdp_category_id
      FROM public.ntdp_categories nc
      WHERE lower(trim(nc.ntdp_category_name)) = lower(trim(m.ntdp_category))
      LIMIT 1
    ),
    def.ntdp_category_id
  ),
  (
    SELECT c.city_id
    FROM public.cities c
    WHERE lower(trim(c.city_name)) = lower(trim(m.city_mun))
       OR lower(trim(c.city_name)) LIKE lower(trim(m.city_mun)) || '%'
    ORDER BY length(c.city_name) ASC
    LIMIT 1
  ),
  m.picture,
  COALESCE(m.gallery_urls, ARRAY[]::TEXT[]),
  m.latitude,
  m.longitude,
  m.address,
  m.description,
  m.establishment_public_id,
  m.searchable_text,
  COALESCE(m.is_published, TRUE),
  m.source_slug,
  m.hours,
  m.barangay,
  COALESCE(m.created_at, NOW()),
  NOW()
FROM missing m
CROSS JOIN defaults def;

-- 4) Flat catalog view for apps (joins stay normalized underneath)
DROP VIEW IF EXISTS public.v_tourist_attractions_catalog;
CREATE VIEW public.v_tourist_attractions_catalog
WITH (security_invoker = true)
AS
SELECT
  ta.establishment_public_id,
  ta.ta_id,
  ta.ta_name,
  ta.address,
  ta.latitude::double precision AS latitude,
  ta.longitude::double precision AS longitude,
  ta.picture,
  COALESCE(ta.gallery_urls, ARRAY[]::TEXT[]) AS gallery_urls,
  ta.description,
  COALESCE(
    ta.hours,
    NULLIF(
      concat_ws(
        ' – ',
        to_char(ta.opening_hours, 'HH24:MI'),
        to_char(ta.closing_hours, 'HH24:MI')
      ),
      ''
    )
  ) AS hours,
  ta.searchable_text,
  COALESCE(ta.is_published, TRUE) AS is_published,
  ta.source_slug,
  ta.barangay,
  ta.created_at,
  ta.updated_at,
  c.city_name AS city_mun,
  tc.type_code,
  tac.category_name AS type,
  nc.ntdp_category_name AS ntdp_category
FROM public.tourist_attractions ta
LEFT JOIN public.cities c ON c.city_id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.type_code_id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.category_id = ta.ta_categories_id
LEFT JOIN public.ntdp_categories nc ON nc.ntdp_category_id = ta.ntdp_category_id;

GRANT SELECT ON public.v_tourist_attractions_catalog TO anon, authenticated;

-- 5) Remount reviews / saved lists onto tourist_attractions UUID
ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_place_id_fkey;
ALTER TABLE public.saved_list_items
  DROP CONSTRAINT IF EXISTS saved_list_items_place_id_fkey;

DELETE FROM public.place_reviews pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.tourist_attractions ta
  WHERE ta.establishment_public_id = pr.place_id
);
DELETE FROM public.saved_list_items sli
WHERE NOT EXISTS (
  SELECT 1 FROM public.tourist_attractions ta
  WHERE ta.establishment_public_id = sli.place_id
);

ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.tourist_attractions(establishment_public_id) ON DELETE CASCADE;

ALTER TABLE public.saved_list_items
  ADD CONSTRAINT saved_list_items_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.tourist_attractions(establishment_public_id) ON DELETE CASCADE;

-- 6) RLS: public read + admin write on tourist_attractions; public read on lookups
ALTER TABLE public.tourist_attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.type_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ntdp_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tourist_attractions" ON public.tourist_attractions;
CREATE POLICY "Anyone can view tourist_attractions"
  ON public.tourist_attractions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cavitour admins insert tourist_attractions" ON public.tourist_attractions;
CREATE POLICY "Cavitour admins insert tourist_attractions"
  ON public.tourist_attractions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins update tourist_attractions" ON public.tourist_attractions;
CREATE POLICY "Cavitour admins update tourist_attractions"
  ON public.tourist_attractions FOR UPDATE
  TO authenticated
  USING (public.is_cavitour_session_admin())
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins delete tourist_attractions" ON public.tourist_attractions;
CREATE POLICY "Cavitour admins delete tourist_attractions"
  ON public.tourist_attractions FOR DELETE
  TO authenticated
  USING (public.is_cavitour_session_admin());

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
GRANT INSERT, UPDATE, DELETE ON public.tourist_attractions TO authenticated;
GRANT SELECT ON public.cities, public.type_codes, public.ta_categories, public.ntdp_categories TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tourist_attractions_ta_id_seq TO authenticated;
