-- Legacy one-shot sync. Prefer: supabase/migrations/20260518120000_sync_places_with_images.sql
-- (preserves admin images + backfills tourist_attractions.picture).
--
-- Sync all establishments from v_cavite_establishments into public.places
-- so saved_list_items FK (place_id -> public.places.id) works for all entries.

BEGIN;

-- Ensure source_slug is available for stable upsert mapping.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS source_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS places_source_slug_uidx
  ON public.places (source_slug);

INSERT INTO public.places (
  name,
  address,
  type,
  hours,
  latitude,
  longitude,
  description,
  ntdp_category,
  source_slug,
  type_code,
  city_mun,
  updated_at
)
SELECT
  COALESCE(v.name, v.ta_name) AS name,
  v.address,
  COALESCE(v.ta_category, v.type_code, 'Place') AS type,
  '' AS hours,
  NULLIF(v.latitude::text, '')::numeric,
  NULLIF(v.longitude::text, '')::numeric,
  v.description,
  v.ntdp_category,
  v.id AS source_slug,
  v.type_code,
  v.city_mun,
  NOW()
FROM public.v_cavite_establishments v
WHERE v.id IS NOT NULL
ON CONFLICT (source_slug) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  type = EXCLUDED.type,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  description = EXCLUDED.description,
  ntdp_category = EXCLUDED.ntdp_category,
  type_code = EXCLUDED.type_code,
  city_mun = EXCLUDED.city_mun,
  updated_at = NOW();

COMMIT;

-- Quick checks:
-- 1) Missing mappings (should be 0)
-- SELECT count(*) AS missing
-- FROM public.v_cavite_establishments v
-- LEFT JOIN public.places p ON p.source_slug = v.id
-- WHERE p.id IS NULL;
--
-- 2) Verify Promenade row exists in places
-- SELECT id, name, source_slug
-- FROM public.places
-- WHERE source_slug IN (
--   SELECT id FROM public.v_cavite_establishments
--   WHERE name ILIKE '%Promenade Des Dasmariñas%'
-- )
-- LIMIT 5;
