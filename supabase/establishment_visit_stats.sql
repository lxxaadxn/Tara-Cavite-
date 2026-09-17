-- Visitor counts feed Admin + future Establishment side from the same place_visits table.
-- Run AFTER: users_and_establishment_owners.sql AND place_checkin_visits.sql
-- Safe to re-run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Fix owner↔ place links to use tourist_attractions (catalog ids)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'establishment_owner_places'
  ) THEN
    -- Drop old FK to public.places if present
    ALTER TABLE public.establishment_owner_places
      DROP CONSTRAINT IF EXISTS establishment_owner_places_place_id_fkey;

    -- Recreate FK to tourist_attractions when that table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tourist_attractions'
    ) THEN
      ALTER TABLE public.establishment_owner_places
        ADD CONSTRAINT establishment_owner_places_place_id_fkey
        FOREIGN KEY (place_id)
        REFERENCES public.tourist_attractions(establishment_public_id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Aggregated visit counts (shared source of truth)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_place_visit_counts AS
SELECT
  v.place_id,
  COUNT(*)::bigint AS total_visits,
  COUNT(*) FILTER (WHERE v.source IN ('qr', 'code'))::bigint AS qr_visits,
  COUNT(*) FILTER (WHERE v.source = 'destination_reached')::bigint AS destination_reached_visits,
  COUNT(*) FILTER (WHERE v.source = 'manual')::bigint AS manual_visits,
  MAX(v.created_at) AS last_visit_at
FROM public.place_visits v
GROUP BY v.place_id;

COMMENT ON VIEW public.v_place_visit_counts IS
  'Per-establishment visit totals for Admin + Establishment dashboards (from QR/code/destination_reached).';

GRANT SELECT ON public.v_place_visit_counts TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Owner helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owns_establishment_place(
  p_place_id UUID,
  uid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_owner_places l
    JOIN public.establishment_owners o ON o.id = l.owner_id
    WHERE l.place_id = p_place_id
      AND l.owner_id = uid
      AND o.account_status = 'active'
      AND o.verification_status IN ('approved', 'under_review', 'pending')
  );
$$;

REVOKE ALL ON FUNCTION public.owns_establishment_place(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_establishment_place(UUID, UUID) TO authenticated, anon;

-- Establishment (or admin) dashboard: visit stats for places I manage
CREATE OR REPLACE FUNCTION public.get_my_establishment_visit_stats()
RETURNS TABLE (
  place_id UUID,
  place_name TEXT,
  checkin_code TEXT,
  total_visits BIGINT,
  qr_visits BIGINT,
  destination_reached_visits BIGINT,
  last_visit_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  -- Platform admin: all establishments with codes/visits
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) AND public.is_cavitour_session_admin() THEN
    RETURN QUERY
    SELECT
      ta.establishment_public_id,
      ta.ta_name,
      c.code,
      COALESCE(vc.total_visits, 0),
      COALESCE(vc.qr_visits, 0),
      COALESCE(vc.destination_reached_visits, 0),
      vc.last_visit_at
    FROM public.tourist_attractions ta
    LEFT JOIN public.place_checkin_codes c ON c.place_id = ta.establishment_public_id
    LEFT JOIN public.v_place_visit_counts vc ON vc.place_id = ta.establishment_public_id
    ORDER BY COALESCE(vc.total_visits, 0) DESC, ta.ta_name;
    RETURN;
  END IF;

  -- Establishment owner: only linked places
  RETURN QUERY
  SELECT
    ta.establishment_public_id,
    ta.ta_name,
    c.code,
    COALESCE(vc.total_visits, 0),
    COALESCE(vc.qr_visits, 0),
    COALESCE(vc.destination_reached_visits, 0),
    vc.last_visit_at
  FROM public.establishment_owner_places l
  JOIN public.establishment_owners o ON o.id = l.owner_id
  JOIN public.tourist_attractions ta ON ta.establishment_public_id = l.place_id
  LEFT JOIN public.place_checkin_codes c ON c.place_id = l.place_id
  LEFT JOIN public.v_place_visit_counts vc ON vc.place_id = l.place_id
  WHERE l.owner_id = uid
    AND o.account_status = 'active'
  ORDER BY COALESCE(vc.total_visits, 0) DESC, ta.ta_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_establishment_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_establishment_visit_stats() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS: owners can read visits + codes for THEIR establishments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners read visits for their places" ON public.place_visits;
CREATE POLICY "Owners read visits for their places"
  ON public.place_visits FOR SELECT
  TO authenticated
  USING (public.owns_establishment_place(place_id));

DROP POLICY IF EXISTS "Owners read checkin codes for their places" ON public.place_checkin_codes;
CREATE POLICY "Owners read checkin codes for their places"
  ON public.place_checkin_codes FOR SELECT
  TO authenticated
  USING (public.owns_establishment_place(place_id));

-- ---------------------------------------------------------------------------
-- 5) Quick verify (optional)
-- ---------------------------------------------------------------------------
-- SELECT * FROM public.v_place_visit_counts ORDER BY total_visits DESC LIMIT 20;
-- SELECT * FROM public.get_my_establishment_visit_stats();
