-- Auto-create public.user_profiles for every auth.users signup (email + Google).
-- Extends profile with email / auth_provider / display_name for admin listing.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider text;
  display text;
BEGIN
  provider := coalesce(
    nullif(trim(new.raw_app_meta_data->>'provider'), ''),
    nullif(trim(new.raw_app_meta_data->'providers'->>0), ''),
    'email'
  );

  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  INSERT INTO public.user_profiles (
    id,
    email,
    auth_provider,
    display_name,
    username,
    avatar_url
  )
  VALUES (
    new.id,
    new.email,
    provider,
    display,
    display,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    auth_provider = COALESCE(public.user_profiles.auth_provider, EXCLUDED.auth_provider),
    display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
    username = COALESCE(public.user_profiles.username, EXCLUDED.username),
    avatar_url = COALESCE(public.user_profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users missing a profile row
INSERT INTO public.user_profiles (
  id,
  email,
  auth_provider,
  display_name,
  username,
  avatar_url
)
SELECT
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_app_meta_data->>'provider'), ''),
    nullif(trim(u.raw_app_meta_data->'providers'->>0), ''),
    'email'
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  ),
  nullif(trim(u.raw_user_meta_data->>'avatar_url'), '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
);

-- Sync email onto existing profiles that lack it
UPDATE public.user_profiles p
SET
  email = COALESCE(p.email, u.email),
  auth_provider = COALESCE(
    p.auth_provider,
    nullif(trim(u.raw_app_meta_data->>'provider'), ''),
    nullif(trim(u.raw_app_meta_data->'providers'->>0), ''),
    'email'
  ),
  display_name = COALESCE(
    p.display_name,
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  ),
  updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.email IS NULL
    OR p.auth_provider IS NULL
    OR p.display_name IS NULL
  );
