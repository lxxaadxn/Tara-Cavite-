-- Auto-generate a STA catalog row + check-in QR code when an establishment is invited.
--
-- What this migration does:
--   1. Add `sta_place_id` column to establishment_owners so we track which STA row
--      belongs to this business.
--   2. Add `google_maps_link` column to establishment_owners (stored from the invite form).
--   3. After any INSERT into establishment_owners, automatically:
--        a. Insert a row into sta_v3_cavite_2025  (the catalog / destination table)
--        b. The existing sta_v3_ensure_checkin_code trigger fires automatically,
--           creating the QR code in place_checkin_codes.
--        c. Back-fill sta_place_id on the owner row.
--   4. Backfill existing owners that already exist but have no STA/QR row yet.
--
-- Safe to re-run (all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- ---------------------------------------------------------------------------
-- 1) New columns on establishment_owners
-- ---------------------------------------------------------------------------
ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS sta_place_id UUID REFERENCES public.sta_v3_cavite_2025(id) ON DELETE SET NULL;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

COMMENT ON COLUMN public.establishment_owners.sta_place_id IS
  'UUID of the matching row in sta_v3_cavite_2025; used to locate the check-in QR code.';
COMMENT ON COLUMN public.establishment_owners.google_maps_link IS
  'Optional Google Maps URL for this business, stored from the invite form.';

-- ---------------------------------------------------------------------------
-- 2) Helper: create a STA row + QR code for an owner, return the new STA id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_establishment_owner_sta_row(p_owner_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name          TEXT;
  v_lgu           TEXT;
  v_address       TEXT;
  v_category      TEXT;
  v_maps_link     TEXT;
  v_existing_sta  UUID;
  v_new_sta       UUID;
BEGIN
  -- Load owner fields
  SELECT
    business_name,
    lgu,
    address,
    business_type,
    google_maps_link,
    sta_place_id
  INTO v_name, v_lgu, v_address, v_category, v_maps_link, v_existing_sta
  FROM public.establishment_owners
  WHERE id = p_owner_id;

  -- Nothing to do if already linked
  IF v_existing_sta IS NOT NULL THEN
    RETURN v_existing_sta;
  END IF;

  -- Need at least a name
  IF v_name IS NULL OR trim(v_name) = '' THEN
    RETURN NULL;
  END IF;

  -- Check if a matching STA row already exists (by name + lgu, case-insensitive)
  SELECT id INTO v_new_sta
  FROM public.sta_v3_cavite_2025
  WHERE lower(trim(ta_name)) = lower(trim(v_name))
    AND (
      v_lgu IS NULL
      OR lower(trim(city_mun)) = lower(trim(v_lgu))
    )
  LIMIT 1;

  -- Create a new STA row if none found
  IF v_new_sta IS NULL THEN
    INSERT INTO public.sta_v3_cavite_2025 (
      sheet_name,
      ta_name,
      city_mun,
      address,
      google_maps_link,
      ta_category,
      ntdp_category,
      is_listed,
      highlight
    )
    VALUES (
      COALESCE(NULLIF(trim(v_lgu), ''), 'Invited'),
      trim(v_name),
      NULLIF(trim(COALESCE(v_lgu, '')), ''),
      NULLIF(trim(COALESCE(v_address, '')), ''),
      NULLIF(trim(COALESCE(v_maps_link, '')), ''),
      NULLIF(trim(COALESCE(v_category, '')), ''),
      NULLIF(trim(COALESCE(v_category, '')), ''),
      FALSE,   -- not publicly listed until admin explicitly marks it
      'none'
    )
    RETURNING id INTO v_new_sta;
    -- ^ The sta_v3_ensure_checkin_code trigger fires here automatically,
    --   inserting a row into place_checkin_codes with a CT-XXXXXXXX code.
  END IF;

  -- Ensure a check-in code exists for this STA row (idempotent)
  INSERT INTO public.place_checkin_codes (place_id, code)
  VALUES (v_new_sta, public.gen_place_checkin_code())
  ON CONFLICT (place_id) DO NOTHING;

  -- Link back to owner
  UPDATE public.establishment_owners
  SET sta_place_id = v_new_sta
  WHERE id = p_owner_id;

  RETURN v_new_sta;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_establishment_owner_sta_row(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_establishment_owner_sta_row(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Trigger: run after every INSERT into establishment_owners
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_establishment_owner_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_establishment_owner_sta_row(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS establishment_owners_auto_sta_qr ON public.establishment_owners;
CREATE TRIGGER establishment_owners_auto_sta_qr
  AFTER INSERT ON public.establishment_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.on_establishment_owner_inserted();

-- ---------------------------------------------------------------------------
-- 4) Backfill: existing owners that have no sta_place_id yet
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.establishment_owners
    WHERE sta_place_id IS NULL
      AND business_name IS NOT NULL
      AND trim(business_name) <> ''
  LOOP
    PERFORM public.ensure_establishment_owner_sta_row(rec.id);
  END LOOP;
END $$;

-- Verify (run manually if needed):
-- SELECT o.business_name, o.sta_place_id, c.code
-- FROM public.establishment_owners o
-- LEFT JOIN public.place_checkin_codes c ON c.place_id = o.sta_place_id
-- ORDER BY o.created_at DESC
-- LIMIT 20;
