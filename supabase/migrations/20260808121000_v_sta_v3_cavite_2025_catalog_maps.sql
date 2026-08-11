-- Catalog view: STA membership + Maps-link coords; images/hours from tourist_attractions.
-- is_published follows is_listed (hide incomplete / red / yellow rows).

CREATE OR REPLACE VIEW public.v_sta_v3_cavite_2025_catalog
WITH (security_invoker = true)
AS
SELECT
  COALESCE(ta.establishment_public_id, s.id) AS establishment_public_id,
  ta.ta_id,
  s.ta_name,
  COALESCE(
    NULLIF(trim(s.address), ''),
    NULLIF(trim(ta.address), ''),
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
  ta.picture,
  COALESCE(ta.gallery_urls, ARRAY[]::TEXT[]) AS gallery_urls,
  COALESCE(
    NULLIF(trim(ta.description), ''),
    concat_ws(
      '. ',
      NULLIF('NTDP: ' || NULLIF(trim(s.ntdp_category), ''), 'NTDP: '),
      NULLIF('Barangay: ' || NULLIF(trim(s.barangay), ''), 'Barangay: '),
      'STA-v3 Cavite 2025 (' || COALESCE(NULLIF(trim(s.city_mun), ''), s.sheet_name) || ')'
    )
  ) AS description,
  NULLIF(
    concat_ws(
      ' – ',
      to_char(ta.opening_hours, 'HH24:MI'),
      to_char(ta.closing_hours, 'HH24:MI')
    ),
    ''
  ) AS hours,
  s.is_listed AS is_published,
  COALESCE(ta.created_at, s.created_at) AS created_at,
  ta.updated_at,
  COALESCE(c.city_name, s.city_mun) AS city_mun,
  COALESCE(tc.type_code, s.type_code) AS type_code,
  COALESCE(tac.category_name, s.ta_category) AS type,
  COALESCE(nc.ntdp_category_name, s.ntdp_category) AS ntdp_category
FROM public.sta_v3_cavite_2025 s
LEFT JOIN public.tourist_attractions ta
  ON lower(trim(ta.ta_name)) = lower(trim(s.ta_name))
LEFT JOIN public.cities c ON c.city_id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.type_code_id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.category_id = ta.ta_categories_id
LEFT JOIN public.ntdp_categories nc ON nc.ntdp_category_id = ta.ntdp_category_id;

GRANT SELECT ON public.v_sta_v3_cavite_2025_catalog TO anon, authenticated;
