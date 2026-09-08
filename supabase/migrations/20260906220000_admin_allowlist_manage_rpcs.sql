-- Manageable admin allowlist RPCs (All Users → Add Admin).
-- Table RLS stays locked; only these SECURITY DEFINER helpers read/write.

CREATE OR REPLACE FUNCTION public.is_cavitour_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cavitour_admin_allowlist a
    WHERE lower(a.email) = lower(trim(coalesce(p_email, '')))
      AND trim(coalesce(p_email, '')) <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.is_cavitour_admin_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cavitour_admin_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cavitour_admin_email(text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_list_allowlist_emails()
RETURNS TABLE (email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.email
  FROM public.cavitour_admin_allowlist a
  WHERE public.is_cavitour_session_admin()
  ORDER BY a.email;
$$;

REVOKE ALL ON FUNCTION public.admin_list_allowlist_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_allowlist_emails() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_add_allowlist_email(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF NOT public.is_cavitour_session_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  normalized := lower(trim(coalesce(p_email, '')));
  IF normalized = '' OR position('@' in normalized) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  INSERT INTO public.cavitour_admin_allowlist (email)
  VALUES (normalized)
  ON CONFLICT (email) DO NOTHING;

  RETURN normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_allowlist_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_allowlist_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_allowlist_email(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  caller text;
BEGIN
  IF NOT public.is_cavitour_session_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  normalized := lower(trim(coalesce(p_email, '')));
  caller := lower(trim(coalesce(auth.jwt()->>'email', '')));

  IF normalized = '' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF normalized = caller THEN
    RAISE EXCEPTION 'You cannot remove your own admin access';
  END IF;

  DELETE FROM public.cavitour_admin_allowlist a
  WHERE lower(a.email) = normalized;

  RETURN normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_allowlist_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_allowlist_email(text) TO authenticated;
