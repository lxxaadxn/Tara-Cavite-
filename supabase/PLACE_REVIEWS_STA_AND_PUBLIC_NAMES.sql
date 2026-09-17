-- Paste in Supabase SQL Editor so reviews save and show for every user.
-- Same as supabase/migrations/20260813120000_place_reviews_sta_and_public_names.sql

GRANT SELECT ON TABLE public.place_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.place_reviews TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.sta_v3_cavite_2025') IS NOT NULL THEN
    ALTER TABLE public.place_reviews
      DROP CONSTRAINT IF EXISTS place_reviews_place_id_fkey;

    IF to_regclass('public.tourist_attractions') IS NOT NULL THEN
      UPDATE public.place_reviews pr
      SET place_id = s.id
      FROM public.tourist_attractions ta
      JOIN public.sta_v3_cavite_2025 s
        ON lower(trim(s.ta_name)) = lower(trim(ta.ta_name))
      WHERE pr.place_id = ta.establishment_public_id
        AND pr.place_id IS DISTINCT FROM s.id;
    END IF;

    DELETE FROM public.place_reviews pr
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = pr.place_id
    );

    ALTER TABLE public.place_reviews
      ADD CONSTRAINT place_reviews_place_id_fkey
      FOREIGN KEY (place_id) REFERENCES public.sta_v3_cavite_2025(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP VIEW IF EXISTS public.reviewer_public_profiles;
CREATE VIEW public.reviewer_public_profiles
WITH (security_invoker = false)
AS
SELECT
  p.id,
  COALESCE(
    NULLIF(trim(p.username), ''),
    NULLIF(trim(p.display_name), ''),
    'Traveler'
  ) AS username
FROM public.user_profiles p;

GRANT SELECT ON public.reviewer_public_profiles TO anon, authenticated;
