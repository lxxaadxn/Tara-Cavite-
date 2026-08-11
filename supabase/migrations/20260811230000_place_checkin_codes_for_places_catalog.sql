-- Fix QR check-in for the live places catalog.
-- place_checkin_codes.place_id FK → public.sta_v3_cavite_2025(id)
-- Safe to re-run.

INSERT INTO public.place_checkin_codes (place_id, code)
SELECT
  s.id,
  public.gen_place_checkin_code()
FROM public.sta_v3_cavite_2025 s
WHERE s.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.place_checkin_codes c WHERE c.place_id = s.id
  );

CREATE OR REPLACE FUNCTION public.get_place_checkin_code(p_place_id UUID)
RETURNS TABLE (code TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  place_name text;
  mapped_id uuid;
BEGIN
  RETURN QUERY
  SELECT c.code, c.is_active
  FROM public.place_checkin_codes c
  WHERE c.place_id = p_place_id
    AND c.is_active = TRUE
  LIMIT 1;
  IF FOUND THEN
    RETURN;
  END IF;

  SELECT trim(p.name) INTO place_name
  FROM public.places p
  WHERE p.id = p_place_id
  LIMIT 1;

  IF place_name IS NULL OR place_name = '' THEN
    RETURN;
  END IF;

  SELECT s.id INTO mapped_id
  FROM public.sta_v3_cavite_2025 s
  WHERE lower(trim(s.ta_name)) = lower(place_name)
  LIMIT 1;

  IF mapped_id IS NULL THEN
    SELECT s.id INTO mapped_id
    FROM public.sta_v3_cavite_2025 s
    WHERE lower(regexp_replace(trim(s.ta_name), '[^a-zA-Z0-9 ]', '', 'g'))
        = lower(regexp_replace(place_name, '[^a-zA-Z0-9 ]', '', 'g'))
    LIMIT 1;
  END IF;

  IF mapped_id IS NOT NULL THEN
    RETURN QUERY
    SELECT c.code, c.is_active
    FROM public.place_checkin_codes c
    WHERE c.place_id = mapped_id
      AND c.is_active = TRUE
    LIMIT 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_place_checkin_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_place_checkin_code(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_place_checkin_by_code(
  p_code TEXT,
  p_source TEXT DEFAULT 'qr'
)
RETURNS TABLE (
  visit_id UUID,
  place_id UUID,
  place_name TEXT,
  already_checked_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
  src text;
  pid uuid;
  pname text;
  existing uuid;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to check in';
  END IF;

  normalized := upper(trim(coalesce(p_code, '')));
  IF normalized = '' THEN
    RAISE EXCEPTION 'Check-in code is required';
  END IF;

  src := lower(trim(coalesce(p_source, 'qr')));
  IF src NOT IN ('qr', 'code') THEN
    src := 'qr';
  END IF;

  SELECT c.place_id INTO pid
  FROM public.place_checkin_codes c
  WHERE upper(c.code) = normalized
    AND c.is_active = TRUE
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive check-in code';
  END IF;

  SELECT coalesce(
    (SELECT trim(s.ta_name) FROM public.sta_v3_cavite_2025 s WHERE s.id = pid LIMIT 1),
    (SELECT trim(p.name) FROM public.places p WHERE p.id = pid LIMIT 1),
    (SELECT trim(p.name)
       FROM public.places p
       JOIN public.sta_v3_cavite_2025 s ON lower(trim(s.ta_name)) = lower(trim(p.name))
      WHERE s.id = pid
      LIMIT 1),
    'Establishment'
  ) INTO pname;

  SELECT v.id INTO existing
  FROM public.place_visits v
  WHERE v.user_id = uid
    AND v.place_id = pid
    AND v.source IN ('qr', 'code')
    AND (v.created_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date
  LIMIT 1;

  IF existing IS NOT NULL THEN
    visit_id := existing;
    place_id := pid;
    place_name := pname;
    already_checked_in := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.place_visits (place_id, user_id, source, checkin_code)
  VALUES (pid, uid, src, normalized)
  RETURNING id INTO new_id;

  visit_id := new_id;
  place_id := pid;
  place_name := pname;
  already_checked_in := FALSE;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_place_visit(
  p_place_id UUID,
  p_source TEXT DEFAULT 'destination_reached'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  src text;
  new_id uuid;
  known boolean := FALSE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF p_place_id IS NULL THEN
    RAISE EXCEPTION 'place_id is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.places p WHERE p.id = p_place_id) THEN
    known := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = p_place_id
  ) THEN
    known := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM public.place_checkin_codes c WHERE c.place_id = p_place_id
  ) THEN
    known := TRUE;
  END IF;

  IF NOT known THEN
    RAISE EXCEPTION 'Unknown establishment';
  END IF;

  src := lower(trim(coalesce(p_source, 'destination_reached')));
  IF src NOT IN ('destination_reached', 'manual', 'qr', 'code') THEN
    src := 'destination_reached';
  END IF;

  INSERT INTO public.place_visits (place_id, user_id, source)
  VALUES (p_place_id, uid, src)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_place_checkin_by_code(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_place_visit(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_place_checkin_by_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_place_visit(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_place_checkin_code_for_sta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.place_checkin_codes (place_id, code)
  VALUES (NEW.id, public.gen_place_checkin_code())
  ON CONFLICT (place_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS places_ensure_checkin_code ON public.places;
DROP TRIGGER IF EXISTS sta_v3_ensure_checkin_code ON public.sta_v3_cavite_2025;
CREATE TRIGGER sta_v3_ensure_checkin_code
  AFTER INSERT ON public.sta_v3_cavite_2025
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_place_checkin_code_for_sta();
