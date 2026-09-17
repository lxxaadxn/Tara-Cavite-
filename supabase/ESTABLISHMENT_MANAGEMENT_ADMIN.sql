-- Admin establishment review: write policies, review columns, lock status fields.
-- Run in Supabase SQL Editor (safe to re-run).

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.establishment_owners.rejection_reason IS 'Set when verification_status = rejected.';
COMMENT ON COLUMN public.establishment_owners.reviewed_at IS 'When an admin last approved, rejected, or requested corrections.';
COMMENT ON COLUMN public.establishment_owners.document_urls IS 'Optional document links until owner signup uploads exist.';

CREATE INDEX IF NOT EXISTS idx_establishment_owners_verification
  ON public.establishment_owners (verification_status);

CREATE OR REPLACE FUNCTION public.guard_establishment_owner_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.account_status IS DISTINCT FROM OLD.account_status
  ) THEN
    IF NOT public.is_cavitour_session_admin() THEN
      RAISE EXCEPTION 'Only admins can change establishment verification or account status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS establishment_owners_guard_status ON public.establishment_owners;
CREATE TRIGGER establishment_owners_guard_status
  BEFORE UPDATE OF verification_status, account_status ON public.establishment_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_establishment_owner_status();

GRANT SELECT, INSERT, UPDATE ON TABLE public.establishment_owners TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read establishment owners" ON public.establishment_owners;
      CREATE POLICY "Admins read establishment owners"
        ON public.establishment_owners FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins update establishment owners" ON public.establishment_owners;
      CREATE POLICY "Admins update establishment owners"
        ON public.establishment_owners FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins insert establishment owners" ON public.establishment_owners;
      CREATE POLICY "Admins insert establishment owners"
        ON public.establishment_owners FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;
