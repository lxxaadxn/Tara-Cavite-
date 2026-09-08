-- Admin-initiated establishment accounts (invite → owner sets password).
-- Run in the Supabase SQL Editor after ESTABLISHMENT_MANAGEMENT_ADMIN.sql (safe to re-run).
--
-- Also deploy the Edge Function (required so the admin never sets a password):
--   npx supabase functions deploy invite-establishment --project-ref bmsftpvixpvtjrlclnlz
--
-- Auth → URL Configuration: add
--   http://localhost:5173/establishment/setup
--   https://<your-web-host>/establishment/setup
--
-- Auth → Email Templates → Invite user. Paste this so the admin's optional note
-- from the Add Establishment modal shows up in the email:
--
--   <h2>You've been invited to join Tara, Cavite!</h2>
--   <p>Your establishment has been registered by the Cavite Tourism Administration.</p>
--   {{ if .Data.custom_message }}
--     <blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #6b8e23;background:#f6f8f2;">
--       {{ .Data.custom_message }}
--     </blockquote>
--   {{ end }}
--   <p><a href="{{ .ConfirmationURL }}">Set up your account</a></p>
--
-- The note is sent as user metadata (`custom_message`) by the Edge Function, so
-- redeploy the function after changing it.

-- ---------------------------------------------------------------------------
-- 1) Invite / public-visibility columns + invited status
-- ---------------------------------------------------------------------------
ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

ALTER TABLE public.establishment_owners
  ADD COLUMN IF NOT EXISTS public_visible BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.establishment_owners.invited_at IS
  'When the Tourism Office sent the account invitation.';
COMMENT ON COLUMN public.establishment_owners.setup_completed_at IS
  'When the establishment set its own password and finished setup.';
COMMENT ON COLUMN public.establishment_owners.public_visible IS
  'Admin-controlled: whether this recognized establishment is shown publicly.';

DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'establishment_owners'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%verification_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.establishment_owners DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE public.establishment_owners
  ADD CONSTRAINT establishment_owners_verification_status_check
  CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended', 'invited'));

-- ---------------------------------------------------------------------------
-- 2) Role helper: dashboard access only after password setup + admin still active
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_establishment_owner(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_owners o
    WHERE o.id = uid
      AND o.account_status = 'active'
      AND o.verification_status = 'approved'
      AND o.setup_completed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_establishment_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_establishment_owner(UUID) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3) Status lock: only admins change verification / account / public_visible,
--    except the invited owner completing password setup.
-- ---------------------------------------------------------------------------
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
    OR NEW.public_visible IS DISTINCT FROM OLD.public_visible
  ) THEN
    IF NEW.verification_status = 'approved'
       AND OLD.verification_status = 'invited'
       AND OLD.setup_completed_at IS NULL
       AND NEW.setup_completed_at IS NOT NULL
       AND NEW.account_status IS NOT DISTINCT FROM OLD.account_status
       AND NEW.public_visible IS NOT DISTINCT FROM OLD.public_visible
       AND NEW.public_visible IS NOT TRUE
       AND auth.uid() = NEW.id
    THEN
      RETURN NEW;
    END IF;

    IF NOT public.is_cavitour_session_admin() THEN
      RAISE EXCEPTION 'Only admins can change establishment status or public visibility';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS establishment_owners_guard_status ON public.establishment_owners;
CREATE TRIGGER establishment_owners_guard_status
  BEFORE UPDATE OF verification_status, account_status, public_visible ON public.establishment_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_establishment_owner_status();

-- Owners cannot self-register; only the Tourism Office (or the invite function) inserts rows.
DROP POLICY IF EXISTS "Owners can insert own owner row" ON public.establishment_owners;

-- ---------------------------------------------------------------------------
-- 4) Invited auth users are not tourists (skip public.users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider text;
  display text;
  avatar text;
  meta_role text;
BEGIN
  meta_role := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), ''));

  provider := coalesce(
    nullif(trim(new.raw_app_meta_data->>'provider'), ''),
    nullif(trim(new.raw_app_meta_data->'providers'->>0), ''),
    'email'
  );

  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'business_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  avatar := nullif(trim(new.raw_user_meta_data->>'avatar_url'), '');

  IF meta_role = 'establishment' THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, auth_provider, display_name, username, avatar_url
  )
  VALUES (
    new.id, new.email, provider, display, display, avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    auth_provider = COALESCE(public.user_profiles.auth_provider, EXCLUDED.auth_provider),
    display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
    username = COALESCE(public.user_profiles.username, EXCLUDED.username),
    avatar_url = COALESCE(public.user_profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  INSERT INTO public.users (
    id, email, username, display_name, avatar_url, auth_provider, account_status
  )
  VALUES (
    new.id, new.email, display, display, avatar, provider, 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    username = COALESCE(public.users.username, EXCLUDED.username),
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    auth_provider = COALESCE(public.users.auth_provider, EXCLUDED.auth_provider),
    updated_at = NOW();

  RETURN new;
END;
$$;
