-- Tourism / establishment announcements + per-traveler read receipts.
-- Published rows power the Announcements feed and the notification bell.
-- Safe to re-run in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('event', 'advisory')),
  title TEXT NOT NULL,
  place TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('admin', 'establishment')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  establishment_owner_id UUID REFERENCES public.establishment_owners(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published_at
  ON public.announcements (published_at DESC NULLS LAST)
  WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_announcements_owner
  ON public.announcements (establishment_owner_id);

COMMENT ON TABLE public.announcements IS
  'LGU / tourism / establishment notices shown on the traveler Announcements tab and notification bell.';

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
  ON public.announcement_reads (announcement_id);

-- ---------------------------------------------------------------------------
-- 2) Write helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.announcements_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.is_published IS TRUE AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  IF NEW.is_published IS FALSE THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_before_write ON public.announcements;
CREATE TRIGGER announcements_before_write
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.announcements_before_write();

CREATE OR REPLACE FUNCTION public.is_approved_establishment_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_owners
    WHERE id = auth.uid()
      AND verification_status = 'approved'
      AND account_status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_establishment_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_establishment_owner() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Grants + RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.announcement_reads TO authenticated;

DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.announcements;
CREATE POLICY "Anyone can read published announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Authors read own announcements" ON public.announcements;
CREATE POLICY "Authors read own announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (author_id = auth.uid() OR establishment_owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Owners insert own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Owners update own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Owners delete own announcements" ON public.announcements;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins read all announcements"
        ON public.announcements FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins insert announcements"
        ON public.announcements FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin() AND source = 'admin')
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update announcements"
        ON public.announcements FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins delete announcements"
        ON public.announcements FOR DELETE
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

CREATE POLICY "Owners insert own announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved_establishment_owner()
    AND source = 'establishment'
    AND author_id = auth.uid()
    AND establishment_owner_id = auth.uid()
  );

CREATE POLICY "Owners update own announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (
    public.is_approved_establishment_owner()
    AND establishment_owner_id = auth.uid()
    AND source = 'establishment'
  )
  WITH CHECK (
    public.is_approved_establishment_owner()
    AND establishment_owner_id = auth.uid()
    AND source = 'establishment'
    AND author_id = auth.uid()
  );

CREATE POLICY "Owners delete own announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (
    public.is_approved_establishment_owner()
    AND establishment_owner_id = auth.uid()
    AND source = 'establishment'
  );

DROP POLICY IF EXISTS "Users read own announcement receipts" ON public.announcement_reads;
CREATE POLICY "Users read own announcement receipts"
  ON public.announcement_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own announcement receipts" ON public.announcement_reads;
CREATE POLICY "Users insert own announcement receipts"
  ON public.announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own announcement receipts" ON public.announcement_reads;
CREATE POLICY "Users delete own announcement receipts"
  ON public.announcement_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Seed current mock cards (stable ids so re-runs are idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.announcements (id, kind, title, place, body, source, is_published, published_at)
VALUES
  (
    '8c1a0b20-5d11-4c1a-9f01-000000000001',
    'event',
    'Amadeo Coffee Weekend',
    'Amadeo, Cavite',
    'Farm visits and tasting booths are open Saturday and Sunday. Expect slower traffic on the town proper after 10 AM.',
    'admin',
    TRUE,
    NOW()
  ),
  (
    '8c1a0b20-5d11-4c1a-9f01-000000000002',
    'advisory',
    'Aguinaldo Highway delays',
    'Dasmariñas – Tagaytay',
    'Road works near SM Dasma are adding 15–25 minutes. Leave earlier if you are heading to the ridge or Tagaytay lookouts.',
    'admin',
    TRUE,
    NOW()
  ),
  (
    '8c1a0b20-5d11-4c1a-9f01-000000000003',
    'event',
    'Heritage walks in Cavite City',
    'Cavite City',
    'Guided walks around the public market and waterfront start at 8 AM on Saturdays. Slots are free; arrive 15 minutes early.',
    'admin',
    TRUE,
    NOW()
  ),
  (
    '8c1a0b20-5d11-4c1a-9f01-000000000004',
    'advisory',
    'Coastal weather notice',
    'Ternate, Maragondon, Naic',
    'Afternoon winds are picking up along the west coast. Check local LGU notices before boat trips or beach stops.',
    'admin',
    TRUE,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
