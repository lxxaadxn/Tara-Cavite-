-- Quick hotfix: add any missing STA Excel columns used by admin/catalog.
-- Paste into Supabase SQL Editor if admin shows:
--   column sta_v3_cavite_2025.region does not exist
--   (or sheet_name / prov_huc / year_est / …)

ALTER TABLE public.sta_v3_cavite_2025
  ADD COLUMN IF NOT EXISTS sheet_name TEXT,
  ADD COLUMN IF NOT EXISTS row_no INTEGER,
  ADD COLUMN IF NOT EXISTS ta_name TEXT,
  ADD COLUMN IF NOT EXISTS type_code TEXT,
  ADD COLUMN IF NOT EXISTS ta_category TEXT,
  ADD COLUMN IF NOT EXISTS ntdp_category TEXT,
  ADD COLUMN IF NOT EXISTS year_est INTEGER,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS prov_huc TEXT,
  ADD COLUMN IF NOT EXISTS city_mun TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS highlight TEXT,
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN,
  ADD COLUMN IF NOT EXISTS opening_hours TIME,
  ADD COLUMN IF NOT EXISTS closing_hours TIME,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS picture TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

UPDATE public.sta_v3_cavite_2025
SET sheet_name = COALESCE(NULLIF(trim(sheet_name), ''), NULLIF(trim(city_mun), ''), 'Unknown')
WHERE sheet_name IS NULL OR trim(sheet_name) = '';

UPDATE public.sta_v3_cavite_2025
SET highlight = 'none'
WHERE highlight IS NULL OR trim(highlight) = '';

UPDATE public.sta_v3_cavite_2025
SET is_listed = FALSE
WHERE is_listed IS NULL;

ALTER TABLE public.sta_v3_cavite_2025
  ALTER COLUMN sheet_name SET DEFAULT 'Unknown';

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.sta_v3_cavite_2025 ALTER COLUMN sheet_name SET NOT NULL;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'sheet_name NOT NULL skipped: %', SQLERRM;
  END;
END $$;

-- Recreate catalog view so it can reference region/prov_huc safely
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
      'STA-v3 Cavite 2025 (' || COALESCE(NULLIF(trim(s.city_mun), ''), s.sheet_name, 'Cavite') || ')'
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
  COALESCE(s.is_listed, FALSE) AS is_published,
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

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sta_v3_cavite_2025'
ORDER BY ordinal_position;
