-- Allow web/mobile establishment pages to load each place's active check-in code (for QR display).
-- Safe to re-run.

DROP POLICY IF EXISTS "Anyone authenticated can read active checkin codes" ON public.place_checkin_codes;
DROP POLICY IF EXISTS "Public can read active checkin codes" ON public.place_checkin_codes;

CREATE POLICY "Public can read active checkin codes"
  ON public.place_checkin_codes FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Optional helper (same data)
CREATE OR REPLACE FUNCTION public.get_place_checkin_code(p_place_id UUID)
RETURNS TABLE (code TEXT, is_active BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.is_active
  FROM public.place_checkin_codes c
  WHERE c.place_id = p_place_id
    AND c.is_active = TRUE
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_place_checkin_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_place_checkin_code(UUID) TO anon, authenticated;
