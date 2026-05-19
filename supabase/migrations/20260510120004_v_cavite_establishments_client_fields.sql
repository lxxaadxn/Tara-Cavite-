-- Expose admin CMS fields to web + mobile via v_cavite_establishments.
-- Run after 20260510120003_admin_bootstrap_no_lgu.sql (or equivalent places columns).

DROP VIEW IF EXISTS public.v_cavite_establishments;

CREATE VIEW public.v_cavite_establishments AS
SELECT
  p.id,
  p.name,
  p.name AS ta_name,
  COALESCE(NULLIF(trim(p.type_code), ''), 'admin') AS type_code,
  COALESCE(NULLIF(trim(p.type), ''), NULLIF(trim(p.ntdp_category), ''), 'Destination') AS ta_category,
  p.ntdp_category,
  p.city_mun,
  p.address,
  p.latitude::double precision AS latitude,
  p.longitude::double precision AS longitude,
  p.description,
  lower(
    concat_ws(
      ' ',
      p.name,
      p.address,
      coalesce(p.city_mun, ''),
      coalesce(p.description, ''),
      coalesce(p.ntdp_category, ''),
      coalesce(p.type, ''),
      coalesce(p.searchable_text, '')
    )
  ) AS searchable_text,
  p.created_at,
  COALESCE(NULLIF(trim(p.lgu_slug), ''), 'admin') AS lgu_slug,
  p.source_slug,
  p.image_url,
  p.gallery_urls,
  p.hours,
  p.phone,
  p.email,
  p.website,
  p.social_facebook,
  p.social_instagram,
  p.social_twitter
FROM public.places p
WHERE p.source_slug LIKE 'admin:%'
  AND p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL
  AND coalesce(p.is_published, true) = true;

ALTER VIEW public.v_cavite_establishments SET (security_invoker = true);
GRANT SELECT ON public.v_cavite_establishments TO anon, authenticated;
