-- Drop app-added denormalized columns; keep normalized opening/closing hours.
DROP VIEW IF EXISTS public.v_tourist_attractions_catalog;

ALTER TABLE public.tourist_attractions
  DROP COLUMN IF EXISTS source_slug,
  DROP COLUMN IF EXISTS hours,
  DROP COLUMN IF EXISTS barangay,
  DROP COLUMN IF EXISTS searchable_text;

DROP INDEX IF EXISTS public.tourist_attractions_source_slug_uidx;

CREATE VIEW public.v_tourist_attractions_catalog
WITH (security_invoker = true)
AS
SELECT
  ta.establishment_public_id,
  ta.ta_id,
  ta.ta_name,
  ta.address,
  ta.latitude::double precision AS latitude,
  ta.longitude::double precision AS longitude,
  ta.picture,
  COALESCE(ta.gallery_urls, ARRAY[]::TEXT[]) AS gallery_urls,
  ta.description,
  NULLIF(
    concat_ws(
      ' – ',
      to_char(ta.opening_hours, 'HH24:MI'),
      to_char(ta.closing_hours, 'HH24:MI')
    ),
    ''
  ) AS hours,
  COALESCE(ta.is_published, TRUE) AS is_published,
  ta.created_at,
  ta.updated_at,
  c.city_name AS city_mun,
  tc.type_code,
  tac.category_name AS type,
  nc.ntdp_category_name AS ntdp_category
FROM public.tourist_attractions ta
LEFT JOIN public.cities c ON c.city_id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.type_code_id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.category_id = ta.ta_categories_id
LEFT JOIN public.ntdp_categories nc ON nc.ntdp_category_id = ta.ntdp_category_id;

GRANT SELECT ON public.v_tourist_attractions_catalog TO anon, authenticated;
