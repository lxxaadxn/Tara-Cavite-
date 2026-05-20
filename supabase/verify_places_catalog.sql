-- Run after 20260518120000_sync_places_with_images.sql

SELECT count(*) AS published_with_coords
FROM public.places
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND coalesce(is_published, true);

SELECT count(*) AS with_images
FROM public.places
WHERE image_url IS NOT NULL
   OR (gallery_urls IS NOT NULL AND cardinality(gallery_urls) > 0);

SELECT id, name, image_url, cardinality(gallery_urls) AS gallery_n, city_mun
FROM public.places
WHERE image_url IS NOT NULL
ORDER BY updated_at DESC NULLS LAST
LIMIT 10;
