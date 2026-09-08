-- Barangay + custom invitation note on establishment accounts, and admin-only
-- drafts for establishments whose details are still being gathered.
-- Safe to re-run in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) New columns on establishment_owners
-- ---------------------------------------------------------------------------
ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS barangay TEXT;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS invite_message TEXT;

COMMENT ON COLUMN public.establishment_owners.barangay IS
  'Barangay / district within the LGU, captured at invite time for regional analytics.';
COMMENT ON COLUMN public.establishment_owners.invite_message IS
  'Optional note the Tourism Office recorded when inviting this establishment.';

-- ---------------------------------------------------------------------------
-- 2) Drafts: contact details saved without sending an invitation yet
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.establishment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  business_name TEXT,
  full_name TEXT,
  phone TEXT,
  business_type TEXT,
  lgu TEXT,
  barangay TEXT,
  address TEXT,
  google_maps_link TEXT,
  invite_message TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.establishment_drafts IS
  'Admin-only staging rows for establishments that have not been invited yet.';

CREATE INDEX IF NOT EXISTS idx_establishment_drafts_updated_at
  ON public.establishment_drafts (updated_at DESC);

DROP TRIGGER IF EXISTS establishment_drafts_set_updated_at ON public.establishment_drafts;
CREATE TRIGGER establishment_drafts_set_updated_at
  BEFORE UPDATE ON public.establishment_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.establishment_drafts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.establishment_drafts TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins manage establishment drafts" ON public.establishment_drafts;
      CREATE POLICY "Admins manage establishment drafts"
        ON public.establishment_drafts FOR ALL
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;
