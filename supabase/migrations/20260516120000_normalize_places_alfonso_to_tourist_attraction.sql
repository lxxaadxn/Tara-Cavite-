-- =============================================================================
-- Normalize places_alfonso → lookup tables + tourist_attraction (3NF)
-- =============================================================================
-- Prerequisites (you said these already exist):
--   public.cities
--   public.ntdp_categories
--   public.ta_categories
--   public.type_codes
--   public.tourist_attraction
--   public.places_alfonso  (raw STA-v3 staging; 10 rows in seed)
--
-- BEFORE RUNNING: confirm column names match your DB (run section 0 in SQL Editor).
-- This script assumes lookup tables use:
--   cities(id, name)
--   type_codes(id, name)              -- e.g. "Nature", "Others"
--   ta_categories(id, name)          -- full STA label, e.g. "102 Falls"
--   ntdp_categories(id, name)          -- e.g. "Nature Tourism"
--   tourist_attraction has FK columns listed in section 1 (adds if missing).
--
-- city_mun and barangay stay on tourist_attraction as plain text (not moved into cities).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Optional: add barangay to raw staging (not in original places_* DDL)
-- ---------------------------------------------------------------------------
ALTER TABLE public.places_alfonso
  ADD COLUMN IF NOT EXISTS barangay TEXT;

-- ---------------------------------------------------------------------------
-- 1) Ensure tourist_attraction has normalized columns + traceability to source
-- ---------------------------------------------------------------------------
ALTER TABLE public.tourist_attraction
  ADD COLUMN IF NOT EXISTS city_mun TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS searchable_text TEXT,
  ADD COLUMN IF NOT EXISTS year_established INTEGER,
  ADD COLUMN IF NOT EXISTS city_id BIGINT,
  ADD COLUMN IF NOT EXISTS type_code_id BIGINT,
  ADD COLUMN IF NOT EXISTS ta_category_id BIGINT,
  ADD COLUMN IF NOT EXISTS ntdp_category_id BIGINT,
  ADD COLUMN IF NOT EXISTS source_places_alfonso_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- If your PK/FK types are UUID instead of BIGINT, change BIGINT above to UUID
-- and ensure lookup tables use the same id type.

CREATE UNIQUE INDEX IF NOT EXISTS tourist_attraction_source_places_alfonso_uidx
  ON public.tourist_attraction (source_places_alfonso_id)
  WHERE source_places_alfonso_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Staging view: parse barangay from legacy description (if column empty)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sta_extract_barangay(p_description TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(trim(substring(coalesce(p_description, '') FROM 'Barangay:\s*([^.]+)')), '');
$$;

CREATE OR REPLACE FUNCTION public.sta_normalize_label(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(trim(regexp_replace(lower(coalesce(p, '')), '\s+', ' ', 'g')), '');
$$;

-- Materialize parsed barangay back to places_alfonso for reference
UPDATE public.places_alfonso p
SET barangay = COALESCE(NULLIF(trim(p.barangay), ''), public.sta_extract_barangay(p.description))
WHERE COALESCE(NULLIF(trim(p.barangay), ''), public.sta_extract_barangay(p.description)) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Seed lookup tables (distinct values from places_alfonso only)
-- ---------------------------------------------------------------------------

-- 3a) cities — use city_mun text; do not split barangay into cities
INSERT INTO public.cities (name)
SELECT DISTINCT trim(p.city_mun) AS name
FROM public.places_alfonso p
WHERE NULLIF(trim(p.city_mun), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.cities c
    WHERE public.sta_normalize_label(c.name) = public.sta_normalize_label(trim(p.city_mun))
  );

-- 3b) type_codes (high-level STA type: Nature, Others, Special Events, …)
INSERT INTO public.type_codes (name)
SELECT DISTINCT trim(p.type_code) AS name
FROM public.places_alfonso p
WHERE NULLIF(trim(p.type_code), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.type_codes tc
    WHERE public.sta_normalize_label(tc.name) = public.sta_normalize_label(trim(p.type_code))
  );

-- 3c) ta_categories (detailed STA category label)
INSERT INTO public.ta_categories (name)
SELECT DISTINCT trim(p.ta_category) AS name
FROM public.places_alfonso p
WHERE NULLIF(trim(p.ta_category), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ta_categories tac
    WHERE public.sta_normalize_label(tac.name) = public.sta_normalize_label(trim(p.ta_category))
  );

-- 3d) ntdp_categories (NTDP tourism product category)
INSERT INTO public.ntdp_categories (name)
SELECT DISTINCT trim(p.ntdp_category) AS name
FROM public.places_alfonso p
WHERE NULLIF(trim(p.ntdp_category), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ntdp_categories nc
    WHERE public.sta_normalize_label(nc.name) = public.sta_normalize_label(trim(p.ntdp_category))
  );

-- ---------------------------------------------------------------------------
-- 4) Migrate rows → tourist_attraction (idempotent on source_places_alfonso_id)
-- ---------------------------------------------------------------------------
WITH staged AS (
  SELECT
    trim(p.ta_name) AS name,
    trim(p.city_mun) AS city_mun,
    COALESCE(NULLIF(trim(p.barangay), ''), public.sta_extract_barangay(p.description)) AS barangay,
    trim(p.address) AS address,
    p.latitude,
    p.longitude,
    trim(
      regexp_replace(
        coalesce(p.description, ''),
        '^\s*NTDP:\s*[^.]+\.\s*Barangay:\s*[^.]+\.\s*',
        '',
        'i'
      )
    ) AS description,
    trim(p.searchable_text) AS searchable_text,
    c.id AS city_id,
    tc.id AS type_code_id,
    tac.id AS ta_category_id,
    nc.id AS ntdp_category_id,
    p.id AS source_places_alfonso_id,
    coalesce(p.created_at, NOW()) AS created_at
  FROM public.places_alfonso p
  LEFT JOIN public.cities c
    ON public.sta_normalize_label(c.name) = public.sta_normalize_label(p.city_mun)
  LEFT JOIN public.type_codes tc
    ON public.sta_normalize_label(tc.name) = public.sta_normalize_label(p.type_code)
  LEFT JOIN public.ta_categories tac
    ON public.sta_normalize_label(tac.name) = public.sta_normalize_label(p.ta_category)
  LEFT JOIN public.ntdp_categories nc
    ON public.sta_normalize_label(nc.name) = public.sta_normalize_label(p.ntdp_category)
  WHERE NULLIF(trim(p.ta_name), '') IS NOT NULL
)
UPDATE public.tourist_attraction ta
SET
  name = s.name,
  city_mun = s.city_mun,
  barangay = s.barangay,
  address = s.address,
  latitude = s.latitude,
  longitude = s.longitude,
  description = s.description,
  searchable_text = s.searchable_text,
  city_id = s.city_id,
  type_code_id = s.type_code_id,
  ta_category_id = s.ta_category_id,
  ntdp_category_id = s.ntdp_category_id,
  updated_at = NOW()
FROM staged s
WHERE ta.source_places_alfonso_id = s.source_places_alfonso_id;

WITH staged AS (
  SELECT
    trim(p.ta_name) AS name,
    trim(p.city_mun) AS city_mun,
    COALESCE(NULLIF(trim(p.barangay), ''), public.sta_extract_barangay(p.description)) AS barangay,
    trim(p.address) AS address,
    p.latitude,
    p.longitude,
    trim(
      regexp_replace(
        coalesce(p.description, ''),
        '^\s*NTDP:\s*[^.]+\.\s*Barangay:\s*[^.]+\.\s*',
        '',
        'i'
      )
    ) AS description,
    trim(p.searchable_text) AS searchable_text,
    c.id AS city_id,
    tc.id AS type_code_id,
    tac.id AS ta_category_id,
    nc.id AS ntdp_category_id,
    p.id AS source_places_alfonso_id,
    coalesce(p.created_at, NOW()) AS created_at
  FROM public.places_alfonso p
  LEFT JOIN public.cities c
    ON public.sta_normalize_label(c.name) = public.sta_normalize_label(p.city_mun)
  LEFT JOIN public.type_codes tc
    ON public.sta_normalize_label(tc.name) = public.sta_normalize_label(p.type_code)
  LEFT JOIN public.ta_categories tac
    ON public.sta_normalize_label(tac.name) = public.sta_normalize_label(p.ta_category)
  LEFT JOIN public.ntdp_categories nc
    ON public.sta_normalize_label(nc.name) = public.sta_normalize_label(p.ntdp_category)
  WHERE NULLIF(trim(p.ta_name), '') IS NOT NULL
)
INSERT INTO public.tourist_attraction (
  name,
  city_mun,
  barangay,
  address,
  latitude,
  longitude,
  description,
  searchable_text,
  city_id,
  type_code_id,
  ta_category_id,
  ntdp_category_id,
  source_places_alfonso_id,
  created_at,
  updated_at
)
SELECT
  s.name,
  s.city_mun,
  s.barangay,
  s.address,
  s.latitude,
  s.longitude,
  s.description,
  s.searchable_text,
  s.city_id,
  s.type_code_id,
  s.ta_category_id,
  s.ntdp_category_id,
  s.source_places_alfonso_id,
  s.created_at,
  NOW()
FROM staged s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tourist_attraction ta
  WHERE ta.source_places_alfonso_id = s.source_places_alfonso_id
);

-- ---------------------------------------------------------------------------
-- 5) Optional FK columns on places_alfonso (link raw → normalized)
-- ---------------------------------------------------------------------------
ALTER TABLE public.places_alfonso
  ADD COLUMN IF NOT EXISTS tourist_attraction_id UUID,
  ADD COLUMN IF NOT EXISTS city_id BIGINT,
  ADD COLUMN IF NOT EXISTS type_code_id BIGINT,
  ADD COLUMN IF NOT EXISTS ta_category_id BIGINT,
  ADD COLUMN IF NOT EXISTS ntdp_category_id BIGINT;

UPDATE public.places_alfonso p
SET
  tourist_attraction_id = ta.id,
  city_id = ta.city_id,
  type_code_id = ta.type_code_id,
  ta_category_id = ta.ta_category_id,
  ntdp_category_id = ta.ntdp_category_id
FROM public.tourist_attraction ta
WHERE ta.source_places_alfonso_id = p.id;

-- ---------------------------------------------------------------------------
-- 6) Enriched read view (apps can SELECT from here instead of denormalized text)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_tourist_attraction_normalized AS
SELECT
  ta.id,
  ta.name,
  ta.city_mun,
  ta.barangay,
  ta.address,
  ta.latitude,
  ta.longitude,
  ta.description,
  ta.searchable_text,
  ta.year_established,
  c.name AS city_lookup_name,
  tc.name AS type_code_name,
  tac.name AS ta_category_name,
  nc.name AS ntdp_category_name,
  ta.source_places_alfonso_id,
  ta.created_at,
  ta.updated_at
FROM public.tourist_attraction ta
LEFT JOIN public.cities c ON c.id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.id = ta.ta_category_id
LEFT JOIN public.ntdp_categories nc ON nc.id = ta.ntdp_category_id;

GRANT SELECT ON public.v_tourist_attraction_normalized TO anon, authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 7) Verification queries (run after migration)
-- ---------------------------------------------------------------------------
-- SELECT count(*) FROM public.places_alfonso;
-- SELECT count(*) FROM public.tourist_attraction WHERE source_places_alfonso_id IS NOT NULL;
-- SELECT p.ta_name, ta.name, c.name, tc.name, tac.name, nc.name
-- FROM public.places_alfonso p
-- LEFT JOIN public.tourist_attraction ta ON ta.source_places_alfonso_id = p.id
-- LEFT JOIN public.cities c ON c.id = ta.city_id
-- LEFT JOIN public.type_codes tc ON tc.id = ta.type_code_id
-- LEFT JOIN public.ta_categories tac ON tac.id = ta.ta_category_id
-- LEFT JOIN public.ntdp_categories nc ON nc.id = ta.ntdp_category_id;
