-- Canonical LGU label: Dasmariñas City (restores City suffix after 20260904130000).

CREATE OR REPLACE FUNCTION public._fold_lgu_label(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both ' ' FROM regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(translate(
          regexp_replace(
            regexp_replace(coalesce(raw, ''), E'\u00C3\u00F1', 'n', 'gi'),
            E'\u00C3\u00B1',
            'n',
            'gi'
          ),
          'ÁáÉéÍíÓóÚúÑñ',
          'AaEeIiOoUuNn'
        )),
        '^city of\s+',
        ''
      ),
      '\s+city\s*$',
      ''
    ),
    '[-–—]+',
    ' ',
    'g'
  ));
$$;

DELETE FROM public.cities a
USING public.cities b
WHERE a.city_id <> b.city_id
  AND public._fold_lgu_label(a.city_name) = 'dasmarinas'
  AND b.city_name = 'Dasmariñas City';

UPDATE public.cities
SET city_name = 'Dasmariñas City',
    lgu_kind = 'city'
WHERE public._fold_lgu_label(city_name) = 'dasmarinas'
  AND city_name IS DISTINCT FROM 'Dasmariñas City';

UPDATE public.sta_v3_cavite_2025
SET city_mun = 'Dasmariñas City'
WHERE public._fold_lgu_label(city_mun) = 'dasmarinas'
  AND city_mun IS DISTINCT FROM 'Dasmariñas City';

UPDATE public.sta_v3_cavite_2025
SET sheet_name = 'Dasmariñas City'
WHERE public._fold_lgu_label(sheet_name) = 'dasmarinas'
  AND sheet_name IS DISTINCT FROM 'Dasmariñas City';

DO $$
BEGIN
  IF to_regclass('public.places_dasmarinas_city') IS NOT NULL THEN
    UPDATE public.places_dasmarinas_city
    SET city_mun = 'Dasmariñas City'
    WHERE public._fold_lgu_label(city_mun) = 'dasmarinas'
      AND city_mun IS DISTINCT FROM 'Dasmariñas City';
  END IF;

  IF to_regclass('public.places') IS NOT NULL THEN
    UPDATE public.places
    SET city_mun = 'Dasmariñas City'
    WHERE public._fold_lgu_label(city_mun) = 'dasmarinas'
      AND city_mun IS DISTINCT FROM 'Dasmariñas City';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'location'
  ) THEN
    UPDATE public.user_profiles
    SET location = 'Dasmariñas City'
    WHERE public._fold_lgu_label(location) = 'dasmarinas'
      AND location IS DISTINCT FROM 'Dasmariñas City';
  END IF;
END $$;

DROP FUNCTION public._fold_lgu_label(text);
