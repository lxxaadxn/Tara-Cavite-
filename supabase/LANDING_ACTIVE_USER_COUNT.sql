-- Public landing stat: count of active traveler accounts.
-- Safe to re-run in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.landing_active_user_count()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT COUNT(*) INTO n
    FROM public.users
    WHERE account_status = 'active';
    RETURN COALESCE(n, 0);
  END IF;

  SELECT COUNT(*) INTO n FROM public.user_profiles;
  RETURN COALESCE(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.landing_active_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.landing_active_user_count() TO anon, authenticated;

COMMENT ON FUNCTION public.landing_active_user_count() IS
  'Anonymous-readable count of active traveler accounts for the public landing page.';
