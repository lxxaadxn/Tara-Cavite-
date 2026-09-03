-- Remount place check-in onto sta_v3_cavite_2025 AFTER/AFTER TA drop.
-- IMPORTANT: This file does NOT reference public.tourist_attractions at all
-- (avoids 42P01 when that table is already gone).
-- Paste entire file into Supabase SQL Editor → Run.

-- ---------------------------------------------------------------------------
-- 0) Ensure tables exist (may have been CASCADE-dropped with tourist_attractions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_checkin_codes (
  place_id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT place_checkin_codes_code_format CHECK (code ~ '^[A-Z0-9-]{6,32}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS place_checkin_codes_code_uidx
  ON public.place_checkin_codes (upper(code));

CREATE TABLE IF NOT EXISTS public.place_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS place_visits_qr_daily_uidx
  ON public.place_visits (user_id, place_id, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE source IN ('qr', 'code');

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
-- 1) Drop any place_id FKs (old TA or STA)
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_checkin_codes
  DROP CONSTRAINT IF EXISTS place_checkin_codes_place_id_fkey;

ALTER TABLE public.place_visits
  DROP CONSTRAINT IF EXISTS place_visits_place_id_fkey;

-- ---------------------------------------------------------------------------
-- 2) Keep only rows that already match STA ids
-- ---------------------------------------------------------------------------
DELETE FROM public.place_visits v
WHERE NOT EXISTS (SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = v.place_id);

DELETE FROM public.place_checkin_codes c
WHERE NOT EXISTS (SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = c.place_id);

-- ---------------------------------------------------------------------------
-- 3) FK → STA
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_checkin_codes
  ADD CONSTRAINT place_checkin_codes_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.sta_v3_cavite_2025(id) ON DELETE CASCADE;

ALTER TABLE public.place_visits
  ADD CONSTRAINT place_visits_place_id_fkey
  FOREIGN KEY (place_id) REFERENCES public.sta_v3_cavite_2025(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 4) Seed missing codes for every STA row
-- ---------------------------------------------------------------------------
INSERT INTO public.place_checkin_codes (place_id, code)
SELECT s.id, public.gen_place_checkin_code()
FROM public.sta_v3_cavite_2025 s
WHERE NOT EXISTS (
  SELECT 1 FROM public.place_checkin_codes c WHERE c.place_id = s.id
);

-- ---------------------------------------------------------------------------
-- 5) Trigger on STA insert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_place_checkin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.place_checkin_codes (place_id, code)
  VALUES (NEW.id, public.gen_place_checkin_code())
  ON CONFLICT (place_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sta_v3_ensure_checkin_code ON public.sta_v3_cavite_2025;
CREATE TRIGGER sta_v3_ensure_checkin_code
  AFTER INSERT ON public.sta_v3_cavite_2025
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_place_checkin_code();

-- ---------------------------------------------------------------------------
-- 6) RPCs join STA only
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

  SELECT c.place_id, s.ta_name
    INTO pid, pname
  FROM public.place_checkin_codes c
  JOIN public.sta_v3_cavite_2025 s ON s.id = c.place_id
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
    SELECT 1 FROM public.sta_v3_cavite_2025 s WHERE s.id = p_place_id
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

GRANT EXECUTE ON FUNCTION public.record_place_checkin_by_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_place_visit(UUID, TEXT) TO authenticated;

ALTER TABLE public.place_checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read active checkin codes" ON public.place_checkin_codes;
CREATE POLICY "Anyone authenticated can read active checkin codes"
  ON public.place_checkin_codes FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can read active checkin codes" ON public.place_checkin_codes;
CREATE POLICY "Public can read active checkin codes"
  ON public.place_checkin_codes FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users read own visits" ON public.place_visits;
CREATE POLICY "Users read own visits"
  ON public.place_visits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify after apply (expect sta ≈ codes ≈ matched):
-- SELECT
--   (SELECT count(*) FROM public.sta_v3_cavite_2025) AS sta,
--   (SELECT count(*) FROM public.place_checkin_codes) AS codes,
--   (SELECT count(*) FROM public.place_checkin_codes c
--      JOIN public.sta_v3_cavite_2025 s ON s.id = c.place_id) AS matched;

SELECT count(*) AS sta_rows FROM public.sta_v3_cavite_2025;
SELECT count(*) AS checkin_codes FROM public.place_checkin_codes;
SELECT count(*) AS matched_codes
FROM public.place_checkin_codes c
JOIN public.sta_v3_cavite_2025 s ON s.id = c.place_id;
