-- Collapse tourist_attractions enrichment into sta_v3_cavite_2025, remount FKs, drop TA.

-- ---------------------------------------------------------------------------
-- 1) STA columns for hours, contact, about, media
-- ---------------------------------------------------------------------------
ALTER TABLE public.sta_v3_cavite_2025
  ADD COLUMN IF NOT EXISTS opening_hours TIME,
  ADD COLUMN IF NOT EXISTS closing_hours TIME,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS picture TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- ---------------------------------------------------------------------------
-- 2) Backfill from tourist_attractions by name (best effort)
-- ---------------------------------------------------------------------------
UPDATE public.sta_v3_cavite_2025 s
SET
  opening_hours = COALESCE(s.opening_hours, ta.opening_hours),
  closing_hours = COALESCE(s.closing_hours, ta.closing_hours),
  description = COALESCE(NULLIF(trim(s.description), ''), NULLIF(trim(ta.description), '')),
  picture = COALESCE(NULLIF(trim(s.picture), ''), NULLIF(trim(ta.picture), '')),
  gallery_urls = CASE
    WHEN COALESCE(cardinality(s.gallery_urls), 0) > 0 THEN s.gallery_urls
    ELSE COALESCE(ta.gallery_urls, '{}'::TEXT[])
  END,
  phone = COALESCE(
    NULLIF(trim(s.phone), ''),
    NULLIF(trim(COALESCE(to_jsonb(ta)->>'phone', '')), '')
  ),
  email = COALESCE(
    NULLIF(trim(s.email), ''),
    NULLIF(trim(COALESCE(to_jsonb(ta)->>'email', '')), '')
  ),
  website = COALESCE(
    NULLIF(trim(s.website), ''),
    NULLIF(trim(COALESCE(to_jsonb(ta)->>'website', '')), '')
  )
FROM public.tourist_attractions ta
WHERE lower(trim(ta.ta_name)) = lower(trim(s.ta_name));

-- ---------------------------------------------------------------------------
-- 3) Remap place_reviews / saved_list_items → STA id
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_place_id_fkey;

ALTER TABLE public.saved_list_items
  DROP CONSTRAINT IF EXISTS saved_list_items_place_id_fkey;

-- Map TA public id → STA id via name
CREATE TEMP TABLE _ta_to_sta AS
SELECT
  ta.establishment_public_id AS old_id,
  s.id AS new_id
FROM public.tourist_attractions ta
JOIN public.sta_v3_cavite_2025 s
  ON lower(trim(s.ta_name)) = lower(trim(ta.ta_name));

UPDATE public.place_reviews pr
SET place_id = m.new_id
FROM _ta_to_sta m
WHERE pr.place_id = m.old_id;

UPDATE public.saved_list_items sli
SET place_id = m.new_id
FROM _ta_to_sta m
WHERE sli.place_id = m.old_id;

-- Drop reviews/saves that still point at unmapped TA ids
DELETE FROM public.place_reviews pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = pr.place_id
);

DELETE FROM public.saved_list_items sli
WHERE NOT EXISTS (
  SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = sli.place_id
);

ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.sta_v3_cavite_2025(id) ON DELETE CASCADE;

ALTER TABLE public.saved_list_items
  ADD CONSTRAINT saved_list_items_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.sta_v3_cavite_2025(id) ON DELETE CASCADE;

DROP TABLE IF EXISTS _ta_to_sta;

-- ---------------------------------------------------------------------------
-- 4) Catalog view: STA-only (no tourist_attractions join)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_sta_v3_cavite_2025_catalog
WITH (security_invoker = true)
AS
SELECT
  s.id AS establishment_public_id,
  NULL::bigint AS ta_id,
  s.ta_name,
  COALESCE(
    NULLIF(trim(s.address), ''),
    NULLIF(
      concat_ws(
        ', ',
        NULLIF(trim(s.barangay), ''),
        NULLIF(trim(s.city_mun), ''),
        NULLIF(trim(s.prov_huc), ''),
        'Philippines'
      ),
      'Philippines'
    )
  ) AS address,
  s.latitude::double precision AS latitude,
  s.longitude::double precision AS longitude,
  s.picture,
  COALESCE(s.gallery_urls, ARRAY[]::TEXT[]) AS gallery_urls,
  COALESCE(
    NULLIF(trim(s.description), ''),
    concat_ws(
      '. ',
      NULLIF('NTDP: ' || NULLIF(trim(s.ntdp_category), ''), 'NTDP: '),
      NULLIF('Barangay: ' || NULLIF(trim(s.barangay), ''), 'Barangay: '),
      'STA-v3 Cavite 2025 (' || COALESCE(NULLIF(trim(s.city_mun), ''), s.sheet_name) || ')'
    )
  ) AS description,
  NULLIF(
    concat_ws(
      ' – ',
      to_char(s.opening_hours, 'HH24:MI'),
      to_char(s.closing_hours, 'HH24:MI')
    ),
    ''
  ) AS hours,
  s.phone,
  s.email,
  s.website,
  s.is_listed AS is_published,
  s.created_at,
  s.created_at AS updated_at,
  COALESCE(c_label.city_name, s.city_mun) AS city_mun,
  COALESCE(tc_label.type_code, s.type_code) AS type_code,
  COALESCE(tac_label.category_name, s.ta_category) AS type,
  COALESCE(nc_label.ntdp_category_name, s.ntdp_category) AS ntdp_category
FROM public.sta_v3_cavite_2025 s
LEFT JOIN public.cities c_label
  ON lower(trim(c_label.city_name)) = lower(trim(s.city_mun))
LEFT JOIN public.type_codes tc_label
  ON lower(trim(tc_label.type_code)) = lower(trim(s.type_code))
LEFT JOIN public.ta_categories tac_label
  ON lower(trim(tac_label.category_name)) = lower(trim(s.ta_category))
LEFT JOIN public.ntdp_categories nc_label
  ON lower(trim(nc_label.ntdp_category_name)) = lower(trim(s.ntdp_category));

GRANT SELECT ON public.v_sta_v3_cavite_2025_catalog TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Drop tourist_attractions (and dependent catalog views that still reference it)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_tourist_attractions_catalog CASCADE;
DROP TABLE IF EXISTS public.tourist_attractions CASCADE;
