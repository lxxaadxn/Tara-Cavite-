-- Separate traveler accounts (public.users) from establishment owners.
-- auth.users remains the login identity; these tables hold role-specific profile data.
-- Safe to re-run in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Traveler / tourist users (web + mobile sign-up)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  display_name TEXT,
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  auth_provider TEXT,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'disabled', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users (account_status);

COMMENT ON TABLE public.users IS
  'Traveler/tourist accounts for Tara, Cavite! web & mobile. Separate from establishment_owners.';

-- ---------------------------------------------------------------------------
-- 2) Establishment owners (business accounts — not created by tourist signup)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.establishment_owners (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  business_name TEXT,
  business_type TEXT,
  lgu TEXT,
  address TEXT,
  avatar_url TEXT,
  auth_provider TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')),
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'disabled', 'deleted')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishment_owners_email_lower
  ON public.establishment_owners (lower(email));
CREATE INDEX IF NOT EXISTS idx_establishment_owners_verification
  ON public.establishment_owners (verification_status);
CREATE INDEX IF NOT EXISTS idx_establishment_owners_lgu
  ON public.establishment_owners (lgu);

COMMENT ON TABLE public.establishment_owners IS
  'Business/establishment owner accounts. Kept separate from tourist public.users.';

-- Optional: which catalog places an owner manages
CREATE TABLE IF NOT EXISTS public.establishment_owner_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.establishment_owners(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'manager', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_establishment_owner_places_owner
  ON public.establishment_owner_places (owner_id);
CREATE INDEX IF NOT EXISTS idx_establishment_owner_places_place
  ON public.establishment_owner_places (place_id);

-- ---------------------------------------------------------------------------
-- 3) updated_at helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS establishment_owners_set_updated_at ON public.establishment_owners;
CREATE TRIGGER establishment_owners_set_updated_at
  BEFORE UPDATE ON public.establishment_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Role helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_app_user(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = uid
      AND u.account_status = 'active'
  );
$$;

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
      AND o.verification_status IN ('approved', 'under_review', 'pending')
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_establishment_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_user(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_establishment_owner(UUID) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5) Signup: every new auth user becomes a traveler in public.users
--    (also keeps existing user_profiles sync for current app screens)
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

  avatar := nullif(trim(new.raw_user_meta_data->>'avatar_url'), '');

  -- Legacy profile row (existing web/mobile profile UI)
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

  -- Separated traveler table
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6) Backfill travelers from existing auth users (does NOT create owners)
-- ---------------------------------------------------------------------------
INSERT INTO public.users (
  id, email, username, display_name, phone, city, avatar_url, auth_provider, account_status
)
SELECT
  u.id,
  COALESCE(p.email, u.email),
  COALESCE(p.username, p.display_name, split_part(coalesce(u.email, ''), '@', 1)),
  COALESCE(p.display_name, p.username, split_part(coalesce(u.email, ''), '@', 1)),
  p.phone,
  p.city,
  p.avatar_url,
  COALESCE(
    p.auth_provider,
    nullif(trim(u.raw_app_meta_data->>'provider'), ''),
    nullif(trim(u.raw_app_meta_data->'providers'->>0), ''),
    'email'
  ),
  'active'
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, public.users.email),
  username = COALESCE(public.users.username, EXCLUDED.username),
  display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
  phone = COALESCE(public.users.phone, EXCLUDED.phone),
  city = COALESCE(public.users.city, EXCLUDED.city),
  avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
  auth_provider = COALESCE(public.users.auth_provider, EXCLUDED.auth_provider),
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_owner_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own traveler row" ON public.users;
CREATE POLICY "Users can read own traveler row"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own traveler row" ON public.users;
CREATE POLICY "Users can update own traveler row"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own traveler row" ON public.users;
CREATE POLICY "Users can insert own traveler row"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can read own owner row" ON public.establishment_owners;
CREATE POLICY "Owners can read own owner row"
  ON public.establishment_owners FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can update own owner row" ON public.establishment_owners;
CREATE POLICY "Owners can update own owner row"
  ON public.establishment_owners FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can insert own owner row" ON public.establishment_owners;
CREATE POLICY "Owners can insert own owner row"
  ON public.establishment_owners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Owners manage own place links" ON public.establishment_owner_places;
CREATE POLICY "Owners manage own place links"
  ON public.establishment_owner_places FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Admins (allowlist) can read both tables when helper exists
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
      DROP POLICY IF EXISTS "Admins read establishment owners" ON public.establishment_owners;
      CREATE POLICY "Admins read establishment owners"
        ON public.establishment_owners FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;

    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read owner place links" ON public.establishment_owner_places;
      CREATE POLICY "Admins read owner place links"
        ON public.establishment_owner_places FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;
