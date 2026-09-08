-- Canonical LGU labels: Dasmariñas City, Mendez-Nuñez.

CREATE OR REPLACE FUNCTION public._fold_lgu_label(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both ' ' FROM regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(translate(coalesce(raw, ''), 'ÁáÉéÍíÓóÚúÑñ', 'AaEeIiOoUuNn')),
          'Ã±',
          'n',
          'g'
        ),
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

DELETE FROM public.cities a
USING public.cities b
WHERE a.city_id <> b.city_id
  AND public._fold_lgu_label(a.city_name) IN ('mendez', 'mendez nunez')
  AND b.city_name = 'Mendez-Nuñez';

UPDATE public.cities
SET city_name = 'Dasmariñas City',
    lgu_kind = 'city'
WHERE public._fold_lgu_label(city_name) = 'dasmarinas'
  AND city_name IS DISTINCT FROM 'Dasmariñas City';

UPDATE public.cities
SET city_name = 'Mendez-Nuñez',
    lgu_kind = 'municipality'
WHERE public._fold_lgu_label(city_name) IN ('mendez', 'mendez nunez')
  AND city_name IS DISTINCT FROM 'Mendez-Nuñez';

UPDATE public.sta_v3_cavite_2025
SET city_mun = 'Dasmariñas City'
WHERE public._fold_lgu_label(city_mun) = 'dasmarinas'
  AND city_mun IS DISTINCT FROM 'Dasmariñas City';

UPDATE public.sta_v3_cavite_2025
SET city_mun = 'Mendez-Nuñez'
WHERE public._fold_lgu_label(city_mun) IN ('mendez', 'mendez nunez')
  AND city_mun IS DISTINCT FROM 'Mendez-Nuñez';

DROP FUNCTION public._fold_lgu_label(text);
