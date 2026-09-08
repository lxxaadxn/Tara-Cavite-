-- Public traveler profiles: safe profile view, shared-list SELECT, visit cities RPC.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS interest_tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

DROP VIEW IF EXISTS public.reviewer_public_profiles;
DROP VIEW IF EXISTS public.traveler_public_profiles;

CREATE VIEW public.traveler_public_profiles
WITH (security_invoker = false)
AS
SELECT
  p.id,
  COALESCE(
    NULLIF(trim(p.username), ''),
    NULLIF(trim(p.display_name), ''),
    'Traveler'
  ) AS username,
  COALESCE(NULLIF(trim(p.bio), ''), '') AS bio,
  COALESCE(p.interest_tags, '{}'::text[]) AS interest_tags,
  NULLIF(trim(p.avatar_url), '') AS avatar_url,
  NULLIF(trim(p.cover_url), '') AS cover_url
FROM public.user_profiles p;

CREATE VIEW public.reviewer_public_profiles
WITH (security_invoker = false)
AS
SELECT id, username
FROM public.traveler_public_profiles;

GRANT SELECT ON public.traveler_public_profiles TO anon, authenticated;
GRANT SELECT ON public.reviewer_public_profiles TO anon, authenticated;

-- Shared (public) saved lists readable by anyone
DROP POLICY IF EXISTS "Anyone can read shared saved lists" ON public.saved_lists;
CREATE POLICY "Anyone can read shared saved lists"
  ON public.saved_lists FOR SELECT
  TO anon, authenticated
  USING (type = 'shared');

DROP POLICY IF EXISTS "Anyone can read items in shared lists" ON public.saved_list_items;
CREATE POLICY "Anyone can read items in shared lists"
  ON public.saved_list_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.saved_lists sl
      WHERE sl.id = saved_list_items.list_id
        AND sl.type = 'shared'
    )
  );

DO $$
BEGIN
  IF to_regclass('public.saved_list_itinerary_items') IS NOT NULL THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Anyone can read itinerary items in shared lists" ON public.saved_list_itinerary_items;
      CREATE POLICY "Anyone can read itinerary items in shared lists"
        ON public.saved_list_itinerary_items FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.saved_lists sl
            WHERE sl.id = saved_list_itinerary_items.list_id
              AND sl.type = 'shared'
          )
        );
    $p$;
  END IF;

  IF to_regclass('public.saved_list_terminal_items') IS NOT NULL THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Anyone can read terminal items in shared lists" ON public.saved_list_terminal_items;
      CREATE POLICY "Anyone can read terminal items in shared lists"
        ON public.saved_list_terminal_items FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.saved_lists sl
            WHERE sl.id = saved_list_terminal_items.list_id
              AND sl.type = 'shared'
          )
        );
    $p$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_profile_travel(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin_count bigint := 0;
  v_cities jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('checkin_count', 0, 'visit_cities', '[]'::jsonb);
  END IF;

  SELECT count(*)::bigint
  INTO v_checkin_count
  FROM public.place_visits v
  WHERE v.user_id = p_user_id;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object('city_mun', city_mun, 'n', n)
      ORDER BY city_mun
    ),
    '[]'::jsonb
  )
  INTO v_cities
  FROM (
    SELECT
      city_mun,
      count(*)::int AS n
    FROM (
      SELECT
        coalesce(
          nullif(trim(s.city_mun), ''),
          nullif(trim(pl.city_mun), ''),
          ''
        ) AS city_mun
      FROM public.place_visits v
      LEFT JOIN public.sta_v3_cavite_2025 s ON s.id = v.place_id
      LEFT JOIN public.places pl ON pl.id = v.place_id
      WHERE v.user_id = p_user_id
    ) resolved
    WHERE city_mun <> ''
    GROUP BY city_mun
  ) grouped;

  RETURN jsonb_build_object(
    'checkin_count', coalesce(v_checkin_count, 0),
    'visit_cities', coalesce(v_cities, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_travel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_travel(uuid) TO anon, authenticated;
