-- Admin last-sign-in lookup for User Management → Active Users.
-- Safe to re-run.

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
