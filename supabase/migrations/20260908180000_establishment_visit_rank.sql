-- The owner dashboard shows the same standing the admin Export reports page
-- lists under "Most visited destinations": every place_visits row in the
-- range, tallied per place, ordered by count. An owner's RLS only exposes
-- their own visits, so the tally has to run in a definer function, and only
-- their own position comes back — never another establishment's numbers.

CREATE OR REPLACE FUNCTION public.get_my_establishment_visit_rank(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  place_rank INT,
  visit_count BIGINT,
  ranked_places INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  target UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT o.sta_place_id INTO target
  FROM public.establishment_owners o
  WHERE o.id = uid
    AND o.account_status = 'active';

  IF target IS NULL THEN
    RETURN QUERY SELECT 0, 0::BIGINT, 0;
    RETURN;
  END IF;

  RETURN QUERY
  WITH tally AS (
    SELECT v.place_id AS pid, COUNT(*)::BIGINT AS hits
    FROM public.place_visits v
    WHERE (p_from IS NULL OR v.created_at >= p_from)
      AND (p_to IS NULL OR v.created_at <= p_to)
    GROUP BY v.place_id
  ), mine AS (
    SELECT t.hits FROM tally t WHERE t.pid = target
  )
  SELECT
    -- No visits in the range means no row on the admin list either, so report
    -- no rank rather than a flattering last place.
    CASE
      WHEN COALESCE((SELECT m.hits FROM mine m), 0) = 0 THEN 0
      ELSE (SELECT COUNT(*)::INT + 1 FROM tally t WHERE t.hits > (SELECT m.hits FROM mine m))
    END,
    COALESCE((SELECT m.hits FROM mine m), 0::BIGINT),
    (SELECT COUNT(*)::INT FROM tally);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_establishment_visit_rank(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_establishment_visit_rank(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
