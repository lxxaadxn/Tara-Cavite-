-- Admin Destinations: accurate visit + QR totals for every places.id
-- Maps STA-keyed place_visits / place_checkin_codes onto public.places by name.
-- Run in Supabase SQL Editor (safe to re-run). Requires is_cavitour_session_admin().

CREATE OR REPLACE FUNCTION public.get_admin_destination_checkin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  IF NOT public.is_cavitour_session_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_build_object(
    'visit_counts',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'place_id', v.place_id,
              'total_visits', v.total_visits,
              'qr_visits', v.qr_visits
            )
          )
          FROM public.v_place_visit_counts v
        ),
        '[]'::jsonb
      ),
    'visits_flat',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'place_id', pv.place_id,
              'source', pv.source
            )
          )
          FROM public.place_visits pv
        ),
        '[]'::jsonb
      ),
    'codes',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'place_id', c.place_id,
              'code', c.code,
              'is_active', c.is_active
            )
          )
          FROM public.place_checkin_codes c
        ),
        '[]'::jsonb
      ),
    'sta',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.ta_name
            )
          )
          FROM public.sta_v3_cavite_2025 s
        ),
        '[]'::jsonb
      )
  )
  INTO payload;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_destination_checkin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_destination_checkin_stats() TO authenticated;

COMMENT ON FUNCTION public.get_admin_destination_checkin_stats() IS
  'Admin Destinations tab: raw visit counts + check-in codes + STA ids (SECURITY DEFINER).';
