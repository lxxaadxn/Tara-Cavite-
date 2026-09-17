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
  ('landing.hero.kicker', 'YOUR ULTIMATE CAVITE TRAVEL COMPANION'),
  ('landing.hero.headline', 'TARA, CAVITE!'),
  ('landing.hero.subtitle', 'Discover verified spots, follow curated step-by-step itineraries, get turn-by-turn navigation, and stay updated with official announcements from local establishments and the Provincial Tourism Office of Cavite in one complete platform.'),
  ('landing.hero.cta', 'Explore Map & Destinations'),
  ('landing.footer.tagline', 'Your verified guide to Cavite establishment search, interactive route navigation, and local travel announcements.'),
  ('landing.footer.contact_email', 'taracavite@gmail.com'),
  ('landing.footer.contact_phone', ''),
  ('landing.hero.cta_href', '/signup'),
  ('landing.hero.image_url', 'https://www.beautyofthephilippines.com/wp-content/uploads/2007/05/Corregidor-Island-2025-11-22-2025-11-22-DJI_0873_HDR-1-marianosayno-2-0-1536x1023.jpg'),
  ('landing.hero.image_alt', 'Aerial view of Corregidor Island, Cavite'),
  ('landing.nav.features', 'Features we provide'),
  ('landing.nav.destinations', 'Top Destinations'),
  ('landing.nav.itineraries', 'Curated Itineraries'),
  ('landing.nav.trails', 'Curated Itineraries'),
  ('landing.nav.why', 'Features we provide'),
  ('landing.why.heading', 'Why Choose Tara, Cavite!'),
  ('landing.why.body', 'Tara, Cavite! combines interactive map navigation and sequential day trails with a comprehensive catalog of verified establishments across the province. Users can save custom travel lists, log location check-ins, and stay informed with real-time notices posted directly by local businesses and the Provincial Tourism Office.'),
  ('landing.why.pill_1', 'Interactive route maps'),
  ('landing.why.pill_2', 'Custom saved lists'),
  ('landing.why.pill_3', 'Establishment and tourism announcements'),
  ('landing.why.stat_establishments', 'Verified Establishments & Attractions'),
  ('landing.why.stat_municipalities', 'Cities & Municipalities Covered'),
  ('landing.why.stat_routes', 'Day Routes with Sequential Stop Timelines'),
  ('landing.why.stat_users', 'Active users'),
  ('landing.why.live_value', 'Active users'),
  ('landing.why.live_label', 'Live count of active traveler accounts'),
  ('landing.features.heading', 'Features we provide'),
  ('landing.features.1.n', '01'),
  ('landing.features.1.title', 'Step-by-Step Route Schedules'),
  ('landing.features.1.body', 'View detailed itinerary stops complete with recommended stay durations, free/paid entry tags, and quick links to navigation.'),
  ('landing.features.1.image_url', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80'),
  ('landing.features.1.href', '/itinerary'),
  ('landing.features.2.n', '02'),
  ('landing.features.2.title', 'Personalized Saved Lists & Check-ins'),
  ('landing.features.2.body', 'Group your favorite spots into custom private lists, leave reviews, and track your travel history with location check-ins.'),
  ('landing.features.2.image_url', 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80'),
  ('landing.features.2.href', '/saved'),
  ('landing.features.3.n', '03'),
  ('landing.features.3.title', 'Turn-by-Turn Navigation'),
  ('landing.features.3.body', 'Get direct travel routes, estimated travel times, and traffic condition updates for driving or commuting.'),
  ('landing.features.3.image_url', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=80'),
  ('landing.features.3.href', '/search'),
  ('landing.features.4.n', '04'),
  ('landing.features.4.title', 'Establishment & Tourism Notices'),
  ('landing.features.4.body', 'Stay informed with direct updates, local event schedules, and travel news posted by verified establishments and the Provincial Tourism Office of Cavite.'),
  ('landing.features.4.image_url', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80'),
  ('landing.features.4.href', '/announcements'),
  ('landing.destinations.heading', 'Explore Cavite’s Top Destinations'),
  ('landing.destinations.body', 'Verified spots drawn directly from the Cavite tourism catalog. Open any tile to search that place.'),
  ('landing.destinations.cta', 'See more places'),
  ('landing.destinations.cta_href', '/search'),
  ('landing.destinations.place_ids', '[]'),
  ('landing.trails.heading', 'Curated Day Trails'),
  ('landing.trails.body', 'Ready-to-use travel routes linking verified destinations with estimated timings.'),
  ('landing.trails.cta', 'View itineraries'),
  ('landing.trails.cta_href', '/itinerary'),
  ('landing.trails.itinerary_ids', '[]'),
  ('landing.signup.heading', 'Ready to start your Cavite journey?'),
  ('landing.signup.body', 'Create a free traveler account to save places, log your check-ins, unlock community reviews, and follow curated routes.'),
  ('landing.signup.primary', 'Create Free Account'),
  ('landing.signup.primary_href', '/signup'),
  ('landing.signup.secondary', 'Browse Map First'),
  ('landing.signup.secondary_href', '/search'),
  ('landing.footer.copyright', '© 2026 Tara, Cavite! All rights reserved.'),
  ('auth.login.welcome', 'Welcome back. Enter your details to log in.'),
  ('auth.login.banner_url', ''),
  ('auth.signup.terms', 'I agree to the Terms of Use and Privacy notice.'),
  ('auth.signup.privacy', 'Your data is used to personalize routes and saved lists. See Privacy for details.'),
  ('auth.reset.heading', 'Forgot password'),
  ('auth.reset.helper', 'Enter your email and we will send you a link to choose a new password.'),
  ('brand.logo_light_url', ''),
  ('brand.logo_dark_url', ''),
  ('brand.favicon_url', ''),
  ('brand.tab_title', 'Tara, Cavite! – Your Guide to Exploring Cavite'),
  ('brand.meta_description', 'Your go-to tourist guide for discovering Cavite''s destinations, routes, food spots, and hidden gems.')
ON CONFLICT (key) DO NOTHING;
