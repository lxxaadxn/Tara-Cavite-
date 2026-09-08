-- Canonical LGU labels: Dasmariñas, Mendez-Nuñez.
-- Remaps mojibake (Ãñ / Ã±) and "City of Dasmariñas" / "Dasmariñas City".
-- Replace mojibake BEFORE folding real ñ, otherwise translate() turns Ãñ into Ãn.

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
  AND b.city_name = 'Dasmariñas';

DELETE FROM public.cities a
USING public.cities b
WHERE a.city_id <> b.city_id
  AND public._fold_lgu_label(a.city_name) IN ('mendez', 'mendez nunez')
  AND b.city_name = 'Mendez-Nuñez';

UPDATE public.cities
SET city_name = 'Dasmariñas',
    lgu_kind = 'city'
WHERE public._fold_lgu_label(city_name) = 'dasmarinas'
  AND city_name IS DISTINCT FROM 'Dasmariñas';

UPDATE public.cities
SET city_name = 'Mendez-Nuñez',
    lgu_kind = 'municipality'
WHERE public._fold_lgu_label(city_name) IN ('mendez', 'mendez nunez')
  AND city_name IS DISTINCT FROM 'Mendez-Nuñez';

UPDATE public.sta_v3_cavite_2025
SET city_mun = 'Dasmariñas'
WHERE public._fold_lgu_label(city_mun) = 'dasmarinas'
  AND city_mun IS DISTINCT FROM 'Dasmariñas';

UPDATE public.sta_v3_cavite_2025
SET city_mun = 'Mendez-Nuñez'
WHERE public._fold_lgu_label(city_mun) IN ('mendez', 'mendez nunez')
  AND city_mun IS DISTINCT FROM 'Mendez-Nuñez';

UPDATE public.sta_v3_cavite_2025
SET sheet_name = 'Dasmariñas'
WHERE public._fold_lgu_label(sheet_name) = 'dasmarinas'
  AND sheet_name IS DISTINCT FROM 'Dasmariñas';

UPDATE public.sta_v3_cavite_2025
SET sheet_name = 'Mendez-Nuñez'
WHERE public._fold_lgu_label(sheet_name) IN ('mendez', 'mendez nunez')
  AND sheet_name IS DISTINCT FROM 'Mendez-Nuñez';

DROP FUNCTION public._fold_lgu_label(text);
