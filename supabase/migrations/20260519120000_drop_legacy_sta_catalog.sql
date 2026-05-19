-- Drop legacy STA-v3 staging catalog (per-LGU tables, view, normalized inventory).
-- Keeps public.places as the single establishment catalog for web/mobile/admin.
-- Run only after public.places is populated and verified (npm run cavite:verify-places).

BEGIN;

DROP VIEW IF EXISTS public.v_cavite_establishments;

DROP TABLE IF EXISTS public.tourist_attraction CASCADE;
DROP TABLE IF EXISTS public.tourist_attractions CASCADE;

DROP TABLE IF EXISTS public.ta_categories CASCADE;
DROP TABLE IF EXISTS public.ntdp_categories CASCADE;
DROP TABLE IF EXISTS public.type_codes CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;

DROP TABLE IF EXISTS public.places_alfonso CASCADE;
DROP TABLE IF EXISTS public.places_amadeo CASCADE;
DROP TABLE IF EXISTS public.places_bacoor_city CASCADE;
DROP TABLE IF EXISTS public.places_carmona_city CASCADE;
DROP TABLE IF EXISTS public.places_cavite_city CASCADE;
DROP TABLE IF EXISTS public.places_dasmarinas_city CASCADE;
DROP TABLE IF EXISTS public.places_general_mariano_alvarez CASCADE;
DROP TABLE IF EXISTS public.places_general_trias_city CASCADE;
DROP TABLE IF EXISTS public.places_imus_city CASCADE;
DROP TABLE IF EXISTS public.places_indang CASCADE;
DROP TABLE IF EXISTS public.places_magallanes CASCADE;
DROP TABLE IF EXISTS public.places_mendez_nunez CASCADE;
DROP TABLE IF EXISTS public.places_noveleta CASCADE;
DROP TABLE IF EXISTS public.places_silang CASCADE;
DROP TABLE IF EXISTS public.places_tagaytay_city CASCADE;
DROP TABLE IF EXISTS public.places_tanza CASCADE;
DROP TABLE IF EXISTS public.places_trece_martires_city CASCADE;

DROP SCHEMA IF EXISTS sta_cavite CASCADE;

COMMIT;
