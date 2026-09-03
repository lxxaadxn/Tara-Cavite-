-- Admin traveler management: persist active/disabled, lock status to admins,
-- user_reports queue, and admin read of activity tables.
-- Run in Supabase SQL Editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- 1) Admin write on public.users + lock account_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_users_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF NOT public.is_cavitour_session_admin() THEN
      RAISE EXCEPTION 'Only admins can change account_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_account_status ON public.users;
CREATE TRIGGER users_guard_account_status
  BEFORE UPDATE OF account_status ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_account_status();

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read travelers" ON public.users;
      CREATE POLICY "Admins read travelers"
        ON public.users FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins update travelers" ON public.users;
      CREATE POLICY "Admins update travelers"
        ON public.users FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins insert travelers" ON public.users;
      CREATE POLICY "Admins insert travelers"
        ON public.users FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) user_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 1 AND char_length(reason) <= 500),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON public.user_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports (status, created_at DESC);

COMMENT ON TABLE public.user_reports IS
  'Admin-flagged traveler reports (open/resolved). Ready for a future in-app report flow.';

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_reports TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read user reports" ON public.user_reports;
      CREATE POLICY "Admins read user reports"
        ON public.user_reports FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins insert user reports" ON public.user_reports;
      CREATE POLICY "Admins insert user reports"
        ON public.user_reports FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins update user reports" ON public.user_reports;
      CREATE POLICY "Admins update user reports"
        ON public.user_reports FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Admin read of activity
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    IF to_regclass('public.place_reviews') IS NOT NULL THEN
      EXECUTE $policy$
        DROP POLICY IF EXISTS "Admins read all place reviews" ON public.place_reviews;
        CREATE POLICY "Admins read all place reviews"
          ON public.place_reviews FOR SELECT
          TO authenticated
          USING (public.is_cavitour_session_admin());
      $policy$;
    END IF;

    IF to_regclass('public.route_history') IS NOT NULL THEN
      EXECUTE $policy$
        DROP POLICY IF EXISTS "Admins read all route history" ON public.route_history;
        CREATE POLICY "Admins read all route history"
          ON public.route_history FOR SELECT
          TO authenticated
          USING (public.is_cavitour_session_admin());
      $policy$;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Last sign-in (Active Users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_last_sign_ins()
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.last_sign_in_at
  FROM auth.users u
  WHERE public.is_cavitour_session_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_user_last_sign_ins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_last_sign_ins() TO authenticated;
