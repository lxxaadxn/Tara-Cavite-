-- Sync v_cavite_establishments → public.places (catalog for web/mobile + saved lists).
-- Preserves admin image_url / gallery_urls on conflict.
-- Prerequisite: v_cavite_establishments exists (20260517120000_... or cavite_sta_v3 bundle).

BEGIN;

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS source_slug TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS searchable_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS lgu_slug TEXT,
  ADD COLUMN IF NOT EXISTS type_code TEXT,
  ADD COLUMN IF NOT EXISTS city_mun TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS places_source_slug_uidx ON public.places (source_slug);

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
  searchable_text,
  lgu_slug,
  is_published,
  updated_at
)
SELECT
  COALESCE(v.name, v.ta_name) AS name,
  v.address,
  COALESCE(NULLIF(trim(v.ta_category), ''), NULLIF(trim(v.type_code), ''), 'Place') AS type,
  '' AS hours,
  v.latitude::numeric,
  v.longitude::numeric,
  v.description,
  v.ntdp_category,
  v.id::text AS source_slug,
  v.type_code,
  v.city_mun,
  COALESCE(
    NULLIF(trim(v.searchable_text), ''),
    lower(concat_ws(' ', v.name, v.ta_name, v.address, v.city_mun, v.ta_category, v.ntdp_category, v.type_code))
  ) AS searchable_text,
  v.lgu_slug,
  TRUE AS is_published,
  NOW() AS updated_at
FROM public.v_cavite_establishments v
WHERE v.id IS NOT NULL
  AND v.latitude IS NOT NULL
  AND v.longitude IS NOT NULL
ON CONFLICT (source_slug) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  type = EXCLUDED.type,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  description = EXCLUDED.description,
  ntdp_category = EXCLUDED.ntdp_category,
  type_code = EXCLUDED.type_code,
  city_mun = EXCLUDED.city_mun,
  searchable_text = EXCLUDED.searchable_text,
  lgu_slug = EXCLUDED.lgu_slug,
  is_published = COALESCE(public.places.is_published, EXCLUDED.is_published),
  image_url = COALESCE(public.places.image_url, EXCLUDED.image_url),
  gallery_urls = CASE
    WHEN public.places.gallery_urls IS NOT NULL AND cardinality(public.places.gallery_urls) > 0
      THEN public.places.gallery_urls
    ELSE EXCLUDED.gallery_urls
  END,
  updated_at = NOW();

-- Backfill image_url from tourist_attractions.picture when it is a URL
UPDATE public.places p
SET
  image_url = ta.picture,
  gallery_urls = CASE
    WHEN (p.gallery_urls IS NULL OR cardinality(p.gallery_urls) = 0) AND ta.picture IS NOT NULL
      THEN ARRAY[ta.picture]::text[]
    ELSE p.gallery_urls
  END,
  updated_at = NOW()
FROM public.tourist_attractions ta
WHERE p.image_url IS NULL
  AND ta.picture IS NOT NULL
  AND trim(ta.picture) ~ '^https?://'
  AND (
    p.source_slug = ta.establishment_public_id::text
    OR p.source_slug = ta.source_places_alfonso_id::text
  );

COMMIT;

-- Verification:
-- SELECT count(*) FROM public.places WHERE latitude IS NOT NULL AND coalesce(is_published, true);
-- SELECT count(*) FROM public.places WHERE image_url IS NOT NULL OR cardinality(gallery_urls) > 0;
