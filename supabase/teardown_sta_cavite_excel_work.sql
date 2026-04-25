-- =============================================================================
-- Remove STA Cavite Excel / province inventory from Supabase (SQL Editor → Run once)
-- After: Settings → API → remove "sta_cavite" from Exposed schemas if present
-- =============================================================================

-- 1) All per-LGU inventory tables (Amadeo, Bacoor, …)
DROP SCHEMA IF EXISTS sta_cavite CASCADE;

-- 2) Remove places rows inserted via STA-style seeds (stable source_slug upserts)
DELETE FROM public.places WHERE source_slug IS NOT NULL;

-- Optional 3) Empty entire places (also clears saved_list_items for those places via FK)
-- Uncomment only if you want zero rows in public.places:
-- TRUNCATE TABLE public.places CASCADE;

-- Optional 4) Drop STA-specific columns from public.places (only if you no longer need them)
-- Uncomment if your app no longer references these columns:
-- DROP INDEX IF EXISTS places_city_mun_idx;
-- DROP INDEX IF EXISTS places_source_slug_uidx;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS type_code;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS city_mun;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS barangay;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS year_est;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS source_slug;
-- ALTER TABLE public.places DROP COLUMN IF EXISTS ntdp_category;
