-- Per-establishment check-in QR/codes + visit log for admin analytics.
-- Destination-reached and QR scans both insert into place_visits (different source).
-- Safe to re-run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) One unique code / QR payload per establishment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_checkin_codes (
  place_id UUID PRIMARY KEY
    REFERENCES public.tourist_attractions(establishment_public_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT place_checkin_codes_code_format CHECK (code ~ '^[A-Z0-9-]{6,32}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS place_checkin_codes_code_uidx
  ON public.place_checkin_codes (upper(code));

CREATE OR REPLACE FUNCTION public.gen_place_checkin_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  raw text;
BEGIN
  raw := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  RETURN 'CT-' || raw;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Visit events (QR / code / destination_reached / manual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL
    REFERENCES public.tourist_attractions(establishment_public_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL
    CHECK (source IN ('qr', 'code', 'destination_reached', 'manual')),
  checkin_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_visits_place_created
  ON public.place_visits (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_visits_user_created
  ON public.place_visits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_visits_source
  ON public.place_visits (source);

-- At most one QR/code check-in per user per place per calendar day (UTC)
CREATE UNIQUE INDEX IF NOT EXISTS place_visits_qr_daily_uidx
  ON public.place_visits (user_id, place_id, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE source IN ('qr', 'code');

-- ---------------------------------------------------------------------------
-- 3) Seed a code for every existing establishment
-- ---------------------------------------------------------------------------
INSERT INTO public.place_checkin_codes (place_id, code)
SELECT
  ta.establishment_public_id,
  public.gen_place_checkin_code()
FROM public.tourist_attractions ta
WHERE NOT EXISTS (
  SELECT 1 FROM public.place_checkin_codes c WHERE c.place_id = ta.establishment_public_id
);

-- Auto-create code when a new establishment is inserted
CREATE OR REPLACE FUNCTION public.ensure_place_checkin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.place_checkin_codes (place_id, code)
  VALUES (NEW.establishment_public_id, public.gen_place_checkin_code())
  ON CONFLICT (place_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tourist_attractions_ensure_checkin_code ON public.tourist_attractions;
CREATE TRIGGER tourist_attractions_ensure_checkin_code
  AFTER INSERT ON public.tourist_attractions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_place_checkin_code();

-- ---------------------------------------------------------------------------
-- 4) RPCs
-- ---------------------------------------------------------------------------
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

  SELECT c.place_id, ta.ta_name
    INTO pid, pname
  FROM public.place_checkin_codes c
  JOIN public.tourist_attractions ta ON ta.establishment_public_id = c.place_id
  WHERE upper(c.code) = normalized
    AND c.is_active = TRUE
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive check-in code';
  END IF;

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
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF p_place_id IS NULL THEN
    RAISE EXCEPTION 'place_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tourist_attractions ta
    WHERE ta.establishment_public_id = p_place_id
  ) THEN
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

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read active checkin codes" ON public.place_checkin_codes;
CREATE POLICY "Anyone authenticated can read active checkin codes"
  ON public.place_checkin_codes FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage checkin codes" ON public.place_checkin_codes;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins manage checkin codes"
        ON public.place_checkin_codes FOR ALL
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read all visits" ON public.place_visits;
      CREATE POLICY "Admins read all visits"
        ON public.place_visits FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users read own visits" ON public.place_visits;
CREATE POLICY "Users read own visits"
  ON public.place_visits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts go through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "No direct visit inserts" ON public.place_visits;
CREATE POLICY "No direct visit inserts"
  ON public.place_visits FOR INSERT
  TO authenticated
  WITH CHECK (false);
