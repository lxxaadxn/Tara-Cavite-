-- Switch catalog to public.tourist_attracted (seeded from places).
-- Apps read/write tourist_attracted; places remains temporarily for rollback.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tourist_attracted (
  establishment_public_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ta_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '—',
  type TEXT,
  hours TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  picture TEXT,
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT,
  ntdp_category TEXT,
  type_code TEXT,
  city_mun TEXT,
  barangay TEXT,
  source_slug TEXT,
  searchable_text TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  lgu_slug TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_twitter TEXT,
  year_est INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tourist_attracted_source_slug_uidx
  ON public.tourist_attracted (source_slug)
  WHERE source_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS tourist_attracted_coords_idx
  ON public.tourist_attracted (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS tourist_attracted_ta_name_idx
  ON public.tourist_attracted (ta_name);

-- Seed from places once (preserve places.id so reviews/saved lists keep working)
INSERT INTO public.tourist_attracted (
  establishment_public_id,
  ta_name,
  address,
  type,
  hours,
  latitude,
  longitude,
  picture,
  gallery_urls,
  description,
  ntdp_category,
  type_code,
  city_mun,
  barangay,
  source_slug,
  searchable_text,
  is_published,
  lgu_slug,
  phone,
  email,
  website,
  social_facebook,
  social_instagram,
  social_twitter,
  year_est,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.name,
  COALESCE(NULLIF(trim(p.address), ''), '—'),
  p.type,
  p.hours,
  p.latitude::double precision,
  p.longitude::double precision,
  p.image_url,
  COALESCE(p.gallery_urls, ARRAY[]::TEXT[]),
  p.description,
  p.ntdp_category,
  p.type_code,
  p.city_mun,
  p.barangay,
  p.source_slug,
  p.searchable_text,
  COALESCE(p.is_published, TRUE),
  p.lgu_slug,
  p.phone,
  p.email,
  p.website,
  p.social_facebook,
  p.social_instagram,
  p.social_twitter,
  p.year_est,
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM public.places p
ON CONFLICT (establishment_public_id) DO UPDATE SET
  ta_name = EXCLUDED.ta_name,
  address = EXCLUDED.address,
  type = EXCLUDED.type,
  hours = EXCLUDED.hours,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  picture = COALESCE(public.tourist_attracted.picture, EXCLUDED.picture),
  gallery_urls = CASE
    WHEN public.tourist_attracted.gallery_urls IS NOT NULL
      AND cardinality(public.tourist_attracted.gallery_urls) > 0
      THEN public.tourist_attracted.gallery_urls
    ELSE EXCLUDED.gallery_urls
  END,
  description = EXCLUDED.description,
  ntdp_category = EXCLUDED.ntdp_category,
  type_code = EXCLUDED.type_code,
  city_mun = EXCLUDED.city_mun,
  barangay = EXCLUDED.barangay,
  source_slug = EXCLUDED.source_slug,
  searchable_text = EXCLUDED.searchable_text,
  is_published = EXCLUDED.is_published,
  lgu_slug = EXCLUDED.lgu_slug,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  social_facebook = EXCLUDED.social_facebook,
  social_instagram = EXCLUDED.social_instagram,
  social_twitter = EXCLUDED.social_twitter,
  year_est = EXCLUDED.year_est,
  updated_at = NOW();

-- Remount FKs from places → tourist_attracted
ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_place_id_fkey;
ALTER TABLE public.saved_list_items
  DROP CONSTRAINT IF EXISTS saved_list_items_place_id_fkey;

-- Drop orphan rows that do not match tourist_attracted ids
DELETE FROM public.place_reviews pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.tourist_attracted ta
  WHERE ta.establishment_public_id = pr.place_id
);
DELETE FROM public.saved_list_items sli
WHERE NOT EXISTS (
  SELECT 1 FROM public.tourist_attracted ta
  WHERE ta.establishment_public_id = sli.place_id
);

ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.tourist_attracted(establishment_public_id) ON DELETE CASCADE;

ALTER TABLE public.saved_list_items
  ADD CONSTRAINT saved_list_items_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.tourist_attracted(establishment_public_id) ON DELETE CASCADE;

-- RLS
ALTER TABLE public.tourist_attracted ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tourist_attracted" ON public.tourist_attracted;
CREATE POLICY "Anyone can view tourist_attracted"
  ON public.tourist_attracted FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cavitour admins insert tourist_attracted" ON public.tourist_attracted;
CREATE POLICY "Cavitour admins insert tourist_attracted"
  ON public.tourist_attracted FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins update tourist_attracted" ON public.tourist_attracted;
CREATE POLICY "Cavitour admins update tourist_attracted"
  ON public.tourist_attracted FOR UPDATE
  TO authenticated
  USING (public.is_cavitour_session_admin())
  WITH CHECK (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins delete tourist_attracted" ON public.tourist_attracted;
CREATE POLICY "Cavitour admins delete tourist_attracted"
  ON public.tourist_attracted FOR DELETE
  TO authenticated
  USING (public.is_cavitour_session_admin());

GRANT SELECT ON public.tourist_attracted TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tourist_attracted TO authenticated;

COMMIT;
