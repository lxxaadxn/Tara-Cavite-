-- Run in Supabase SQL Editor after applying 20260517120000_v_cavite_establishments_tourist_attraction.sql

SELECT count(*) AS total_establishments
FROM public.v_cavite_establishments
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

SELECT lgu_slug, count(*) AS n
FROM public.v_cavite_establishments
GROUP BY lgu_slug
ORDER BY n DESC;

SELECT id, name, city_mun, lgu_slug
FROM public.v_cavite_establishments
ORDER BY created_at DESC NULLS LAST
LIMIT 10;
