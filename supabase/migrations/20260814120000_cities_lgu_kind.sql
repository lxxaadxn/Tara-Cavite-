-- Split public.cities into City vs Municipality via lgu_kind.
-- Table name stays `cities` so existing FKs and catalog views keep working.

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS lgu_kind text;

UPDATE public.cities
SET lgu_kind = CASE
  WHEN lower(regexp_replace(
    translate(city_name, 'ÁáÉéÍíÓóÚúÑñ', 'AaEeIiOoUuNn'),
    '\s+city\s*$',
    '',
    'i'
  )) IN (
    'bacoor',
    'carmona',
    'cavite',
    'dasmarinas',
    'general trias',
    'imus',
    'tagaytay',
    'trece martires'
  ) THEN 'city'
  WHEN city_name ~* '\ycity\y'
    AND lower(city_name) NOT LIKE '%general mariano alvarez%'
    THEN 'city'
  ELSE 'municipality'
END
WHERE lgu_kind IS NULL
   OR lgu_kind NOT IN ('city', 'municipality');

ALTER TABLE public.cities
  ALTER COLUMN lgu_kind SET DEFAULT 'municipality';

UPDATE public.cities SET lgu_kind = 'municipality' WHERE lgu_kind IS NULL;

ALTER TABLE public.cities
  ALTER COLUMN lgu_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cities_lgu_kind_check'
  ) THEN
    ALTER TABLE public.cities
      ADD CONSTRAINT cities_lgu_kind_check
      CHECK (lgu_kind IN ('city', 'municipality'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cities_lgu_kind_idx ON public.cities (lgu_kind);

COMMENT ON TABLE public.cities IS
  'Cavite cities and municipalities. Distinguish with lgu_kind = city | municipality.';
COMMENT ON COLUMN public.cities.lgu_kind IS 'city or municipality';

CREATE OR REPLACE VIEW public.v_cities AS
SELECT city_id, city_name, lgu_kind
FROM public.cities
WHERE lgu_kind = 'city';

CREATE OR REPLACE VIEW public.v_municipalities AS
SELECT city_id, city_name, lgu_kind
FROM public.cities
WHERE lgu_kind = 'municipality';

GRANT SELECT ON public.v_cities, public.v_municipalities TO anon, authenticated;
