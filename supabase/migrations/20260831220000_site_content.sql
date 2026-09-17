-- Admin-editable public copy and asset URLs (landing, auth, brand).
-- Safe to re-run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_content IS
  'Key-value CMS for landing, auth screens, and brand assets. Public read, admin write.';

CREATE OR REPLACE FUNCTION public.site_content_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.key := TRIM(NEW.key);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_content_before_write ON public.site_content;
CREATE TRIGGER site_content_before_write
  BEFORE INSERT OR UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.site_content_before_write();

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_content TO authenticated;

DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins insert site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins update site content" ON public.site_content;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins insert site content"
        ON public.site_content FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update site content"
        ON public.site_content FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-content',
  'site-content',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read site-content" ON storage.objects;
CREATE POLICY "Public read site-content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-content');

DROP POLICY IF EXISTS "Admins upload site-content" ON storage.objects;
DROP POLICY IF EXISTS "Admins update site-content" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete site-content" ON storage.objects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins upload site-content"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'site-content'
          AND public.is_cavitour_session_admin()
        )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update site-content"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'site-content' AND public.is_cavitour_session_admin())
        WITH CHECK (bucket_id = 'site-content' AND public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins delete site-content"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'site-content' AND public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

ALTER TABLE public.site_content REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_content'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;
    END IF;
  END IF;
END $$;

INSERT INTO public.site_content (key, value) VALUES
  ('landing.hero.kicker', 'Explore Cavite establishments'),
  ('landing.hero.headline', 'CAVITE TOUR'),
  ('landing.hero.subtitle', 'Search the NTDP catalog, browse maps, save lists, and follow curated routes — your Cavite travel companion in one place.'),
  ('landing.hero.cta', 'Search'),
  ('landing.footer.tagline', 'Cavite establishment search, maps, and curated routes.'),
  ('landing.footer.contact_email', ''),
  ('landing.footer.contact_phone', ''),
  ('auth.login.welcome', 'Welcome back. Enter your details to log in.'),
  ('auth.login.banner_url', ''),
  ('auth.signup.terms', 'By creating an account you agree to the Tara, Cavite! terms of use.'),
  ('auth.signup.privacy', 'Your data is used to personalize routes and saved lists. See Privacy for details.'),
  ('auth.reset.heading', 'Forgot password'),
  ('auth.reset.helper', 'Enter your email and we will send you a link to choose a new password.'),
  ('brand.logo_light_url', ''),
  ('brand.logo_dark_url', ''),
  ('brand.favicon_url', ''),
  ('brand.meta_description', 'Your go-to tourist guide for discovering Cavite''s destinations, routes, food spots, and hidden gems.')
ON CONFLICT (key) DO NOTHING;
