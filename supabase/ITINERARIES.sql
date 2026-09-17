-- Curated admin itineraries shared with web + mobile travelers.
-- Safe to re-run in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  duration_label TEXT NOT NULL DEFAULT '',
  price_tier SMALLINT NOT NULL DEFAULT 2 CHECK (price_tier IN (1, 2, 3)),
  price_tier_label TEXT NOT NULL DEFAULT 'Moderate',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  summary TEXT NOT NULL DEFAULT '',
  highlights TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tips TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  best_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'flagged')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_status_updated
  ON public.itineraries (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.itinerary_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  time_window TEXT NOT NULL DEFAULT '',
  duration_hint TEXT NOT NULL DEFAULT '',
  cost_type TEXT NOT NULL DEFAULT '',
  expect_tag TEXT NOT NULL DEFAULT '',
  vibe_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  venue_name TEXT NOT NULL DEFAULT '',
  venue_lat DOUBLE PRECISION,
  venue_lng DOUBLE PRECISION,
  maps_url TEXT NOT NULL DEFAULT '',
  highlights TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  place_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_stops_itinerary
  ON public.itinerary_stops (itinerary_id, sort_order);

COMMENT ON TABLE public.itineraries IS
  'Admin-curated traveler itineraries. Published rows power web and mobile catalogs.';

-- ---------------------------------------------------------------------------
-- 2) updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.itineraries_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.slug := NULLIF(TRIM(NEW.slug), '');
  IF NEW.slug IS NULL THEN
    NEW.slug := REPLACE(LOWER(NEW.id::text), '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS itineraries_before_write ON public.itineraries;
CREATE TRIGGER itineraries_before_write
  BEFORE INSERT OR UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.itineraries_before_write();

-- ---------------------------------------------------------------------------
-- 3) Grants + RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_stops ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.itineraries TO anon, authenticated;
GRANT SELECT ON public.itinerary_stops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.itineraries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.itinerary_stops TO authenticated;

DROP POLICY IF EXISTS "Anyone can read published itineraries" ON public.itineraries;
CREATE POLICY "Anyone can read published itineraries"
  ON public.itineraries FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can read stops of published itineraries" ON public.itinerary_stops;
CREATE POLICY "Anyone can read stops of published itineraries"
  ON public.itinerary_stops FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_stops.itinerary_id
        AND i.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins read all itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Admins write itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Admins update itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Admins delete itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Admins read all itinerary stops" ON public.itinerary_stops;
DROP POLICY IF EXISTS "Admins insert itinerary stops" ON public.itinerary_stops;
DROP POLICY IF EXISTS "Admins update itinerary stops" ON public.itinerary_stops;
DROP POLICY IF EXISTS "Admins delete itinerary stops" ON public.itinerary_stops;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins read all itineraries"
        ON public.itineraries FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins write itineraries"
        ON public.itineraries FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update itineraries"
        ON public.itineraries FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins delete itineraries"
        ON public.itineraries FOR DELETE
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins read all itinerary stops"
        ON public.itinerary_stops FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins insert itinerary stops"
        ON public.itinerary_stops FOR INSERT
        TO authenticated
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update itinerary stops"
        ON public.itinerary_stops FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins delete itinerary stops"
        ON public.itinerary_stops FOR DELETE
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Cover images
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'itinerary-covers',
  'itinerary-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read itinerary-covers" ON storage.objects;
CREATE POLICY "Public read itinerary-covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'itinerary-covers');

DROP POLICY IF EXISTS "Admins upload itinerary-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins update itinerary-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete itinerary-covers" ON storage.objects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins upload itinerary-covers"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'itinerary-covers'
          AND public.is_cavitour_session_admin()
        )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update itinerary-covers"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'itinerary-covers' AND public.is_cavitour_session_admin())
        WITH CHECK (bucket_id = 'itinerary-covers' AND public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins delete itinerary-covers"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'itinerary-covers' AND public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Realtime
-- ---------------------------------------------------------------------------
ALTER TABLE public.itineraries REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_stops REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'itineraries'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.itineraries;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'itinerary_stops'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_stops;
    END IF;
  END IF;
END $$;


-- Seed curated mock catalog (idempotent on slug).
INSERT INTO public.itineraries (id, slug, title, subtitle, route, image, duration_label, price_tier, price_tier_label, tags, summary, highlights, tips, best_time, status, featured) VALUES (
  'a1111111-1111-4111-8111-111111111111', 'highlands', 'Highlands Getaway', 'Silang → Tagaytay ridge', 'Silang - Tagaytay', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', '1 day', 2, 'Moderate', ARRAY['Views', 'Food']::text[], 'Upland farms, outlet shopping, and ridge viewpoints — a full Silang-to-Tagaytay day using verified Cavite establishments.', ARRAY['Starts in Silang cafés and farms, ends at Tagaytay lookouts', 'Stops ordered for a one-way ridge day', 'Every featured spot opens in Search']::text[], ARRAY['Light jacket after 4 PM', 'Cash preferred for local vendors', 'Peak traffic on weekends']::text[], 'Weekday mornings · clearer Dec–May', 'published', true
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.itinerary_stops (itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
SELECT * FROM (VALUES
('a1111111-1111-4111-8111-111111111111'::uuid, 0, 'Farm & café morning', 'Begin with gardens and local roasts before heading upland.', '08:00 AM – 10:00 AM', '~2 hrs', 'Pay per Order', 'Sip & Snack', ARRAY[]::text[], 'Gourmet Farms, Inc.', 14.223624, 120.9741497, '', ARRAY['Order a signature brew and sit facing the greenhouse', 'Walk the herb garden before the ridge climb']::text[], '93e95b24-12e1-4bb6-a69e-100fbd9137e1'::uuid),
('a1111111-1111-4111-8111-111111111111'::uuid, 1, 'Designer outlet break', 'Walkable retail village — good for snacks and souvenirs.', '10:30 AM – 12:30 PM', '~2 hrs', 'Pay per Order', 'Souvenir Shopping', ARRAY[]::text[], 'Acienda Designer Outlet', 14.1836088, 120.9611198, '', ARRAY['Browse walkable retail lanes for souvenirs', 'Grab a light snack before the lookout stretch']::text[], '9e65d893-01c9-4200-9dc0-505392aca8bc'::uuid),
('a1111111-1111-4111-8111-111111111111'::uuid, 2, 'Ridge picnic stop', 'Classic Tagaytay green space with Taal-facing views.', '01:00 PM – 03:00 PM', '~2 hrs', 'Free Entry', 'Sip & Snack', ARRAY[]::text[], 'Tagaytay Picnic Grove', 14.0992606, 120.9391818, '', ARRAY['Pick a Taal-facing lawn for a picnic pause', 'Stay for clearer afternoon views on weekdays']::text[], 'a22975da-b031-4baa-9353-d9dbabe980a2'::uuid),
('a1111111-1111-4111-8111-111111111111'::uuid, 3, 'Skyline finale', 'End at the high lookout while light is still clear.', '03:30 PM – 05:00 PM', '~1.5 hrs', 'Entrance Fee Required', '', ARRAY[]::text[], 'People''s Park in the Sky', 14.1458, 121.0264, '', ARRAY['Arrive before late haze for the skyline view', 'Bring a light jacket for the breeze after 4 PM']::text[], '693db4c7-29af-4571-8fe7-4f40a2bf2f4d'::uuid)
) AS v(itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
WHERE NOT EXISTS (SELECT 1 FROM public.itinerary_stops s WHERE s.itinerary_id = 'a1111111-1111-4111-8111-111111111111'::uuid);

INSERT INTO public.itineraries (id, slug, title, subtitle, route, image, duration_label, price_tier, price_tier_label, tags, summary, highlights, tips, best_time, status, featured) VALUES (
  'a2222222-2222-4222-8222-222222222222', 'heritage', 'Heritage & Horizons Trail', 'Imus → Bacoor → Noveleta', 'Imus - Bacoor - Noveleta', 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80', 'Full day', 1, 'Budget-friendly', ARRAY['Culture', 'History']::text[], 'Flag heritage in Imus, ancestral houses toward the bay, and Noveleta’s tribunal — all linked to catalogued sites.', ARRAY['National flag shrine and cathedral in Imus', 'Ancestral architecture on the corridor south', 'Waterfront-adjacent finish in Noveleta']::text[], ARRAY['Wear breathable clothes', 'Bring water', 'Most sites close early evenings']::text[], 'Morning to late afternoon', 'published', true
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.itinerary_stops (itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
SELECT * FROM (VALUES
('a2222222-2222-4222-8222-222222222222'::uuid, 0, 'National flag shrine', 'Start at the historic declaration site in Imus.', '08:00 AM – 09:30 AM', '~1.5 hrs', 'Free Entry', '', ARRAY[]::text[], 'Imus Historical Landmark', 14.4297798, 120.9360565, '', ARRAY['Read the declaration markers before crowds build', 'Photograph the grounds while light is still soft']::text[], '6b95f300-1cd6-4097-ba75-371a75041aca'::uuid),
('a2222222-2222-4222-8222-222222222222'::uuid, 1, 'Imus cathedral', 'Short hop to the plaza and cathedral district.', '09:45 AM – 11:00 AM', '~1.25 hrs', 'Free Entry', '', ARRAY[]::text[], 'Imus Cathedral', 14.4297798, 120.9360565, '', ARRAY['Walk the plaza and cathedral facade', 'Step inside if mass or visiting hours allow']::text[], '9194ec49-4a06-418b-b6b9-582c96737e25'::uuid),
('a2222222-2222-4222-8222-222222222222'::uuid, 2, 'Ancestral corridor', 'Heritage house stop before reaching the coast.', '11:30 AM – 01:30 PM', '~2 hrs', 'Entrance Fee Required', '', ARRAY[]::text[], 'Cuenca Ancestral House', 14.4596033, 120.9598169, '', ARRAY['Tour the ancestral house interiors if open', 'Note architectural details along the corridor']::text[], '490c7feb-ecd4-4391-94ae-58486b908d10'::uuid),
('a2222222-2222-4222-8222-222222222222'::uuid, 3, 'Noveleta tribunal', 'Wrap with a preserved civic landmark by the shore.', '02:00 PM – 03:30 PM', '~1.5 hrs', 'Free Entry', '', ARRAY[]::text[], 'Tribunal House of Noveleta', 14.4278394, 120.8808454, '', ARRAY['See the preserved civic landmark up close', 'Finish with a short walk toward the shore']::text[], '3d882e76-90b2-42ad-923c-e5056446cdbf'::uuid)
) AS v(itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
WHERE NOT EXISTS (SELECT 1 FROM public.itinerary_stops s WHERE s.itinerary_id = 'a2222222-2222-4222-8222-222222222222'::uuid);

INSERT INTO public.itineraries (id, slug, title, subtitle, route, image, duration_label, price_tier, price_tier_label, tags, summary, highlights, tips, best_time, status, featured) VALUES (
  'a3333333-3333-4333-8333-333333333333', 'coastal', 'Coastal Calm Journey', 'Tanza → Julugan → Bacoor', 'Tanza - Bacoor', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', '1 day', 2, 'Moderate', ARRAY['Beach', 'Seafood']::text[], 'Plaza heritage, hacienda grounds, fish port, and mangroves — a relaxed coastal day from Tanza toward Manila Bay.', ARRAY['Seafood and port stops in Tanza', 'Heritage plaza and hacienda', 'Mangrove boardwalk finish']::text[], ARRAY['Bring sunblock', 'Carry extra clothes', 'Check weather for waves']::text[], 'Late morning to sunset', 'published', true
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.itinerary_stops (itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
SELECT * FROM (VALUES
('a3333333-3333-4333-8333-333333333333'::uuid, 0, 'Town plaza', 'Meet the route at Tanza’s central plaza.', '09:00 AM – 10:30 AM', '~1.5 hrs', 'Free Entry', '', ARRAY[]::text[], 'Plaza de San Agustin', 14.400675, 120.8572845, '', ARRAY['Start at the central plaza for orientation photos', 'Note heritage markers before the hacienda hop']::text[], '5b044510-baec-4acb-80f9-0945e7fc7865'::uuid),
('a3333333-3333-4333-8333-333333333333'::uuid, 1, 'Hacienda grounds', 'Stroll heritage grounds before heading to the coast.', '10:45 AM – 12:15 PM', '~1.5 hrs', 'Entrance Fee Required', '', ARRAY[]::text[], 'Casa Hacienda de Tanza', 14.400675, 120.8572845, '', ARRAY['Stroll the heritage grounds at an easy pace', 'Look for shade before the port heat']::text[], '5fbb3395-a820-478b-a72b-d3ca6cd0adb5'::uuid),
('a3333333-3333-4333-8333-333333333333'::uuid, 2, 'Fish port', 'Fresh catch and harbor views at Julugan.', '12:30 PM – 02:30 PM', '~2 hrs', 'Pay per Order', 'Full Meal', ARRAY[]::text[], 'Julugan Fish Port', 14.400675, 120.8572845, '', ARRAY['Try a seafood plate while watching harbor traffic', 'Ask vendors what came in that morning']::text[], '606dfa63-4830-4fd7-9a8f-36c98a8b92d6'::uuid),
('a3333333-3333-4333-8333-333333333333'::uuid, 3, 'Mangrove walk', 'Close with coastal greenery along the bay.', '03:00 PM – 05:00 PM', '~2 hrs', 'Free Entry', '', ARRAY[]::text[], 'Bacoor Mangrove Eco-Park', 14.4596033, 120.9598169, '', ARRAY['Walk the boardwalk toward late-day light', 'Watch the bay as the breeze picks up']::text[], 'b672165c-2baf-4992-bf29-a19bd8c3cd76'::uuid)
) AS v(itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
WHERE NOT EXISTS (SELECT 1 FROM public.itinerary_stops s WHERE s.itinerary_id = 'a3333333-3333-4333-8333-333333333333'::uuid);

INSERT INTO public.itineraries (id, slug, title, subtitle, route, image, duration_label, price_tier, price_tier_label, tags, summary, highlights, tips, best_time, status, featured) VALUES (
  'a4444444-4444-4444-8444-444444444444', 'bloomfields', 'Bloomfields & Breezes Route', 'Silang → Amadeo → General Trias → Dasmariñas', 'Silang - Amadeo - General Trias - Dasmariñas', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', 'Half day', 2, 'Moderate', ARRAY['Gardens', 'Cafe']::text[], 'Coffee country and cafés from Silang through Amadeo and General Trias, ending at a Dasmariñas museum stop.', ARRAY['Coffee trail through Amadeo', 'Café break in General Trias', 'Museum finish in Dasmariñas']::text[], ARRAY['Weekdays are less crowded', 'Bring umbrella for midday sun']::text[], 'Early morning', 'published', true
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.itinerary_stops (itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
SELECT * FROM (VALUES
('a4444444-4444-4444-8444-444444444444'::uuid, 0, 'Silang farms', 'Morning stop at upland gardens and farm retail.', '07:30 AM – 09:00 AM', '~1.5 hrs', 'Pay per Order', 'Sip & Snack', ARRAY[]::text[], 'Gourmet Farms, Inc.', 14.223624, 120.9741497, '', ARRAY['Walk the farm retail lanes while it is still cool', 'Pick a garden path before the café stretch']::text[], '93e95b24-12e1-4bb6-a69e-100fbd9137e1'::uuid),
('a4444444-4444-4444-8444-444444444444'::uuid, 1, 'Coffee heritage', 'Amadeo mural and coffee culture pause.', '09:15 AM – 10:15 AM', '~1 hr', 'Free Entry', '', ARRAY[]::text[], 'Amadeo Coffee Mural', 14.1704, 120.9236, '', ARRAY['Stop at the coffee mural for a culture pause', 'Ask locals where the day’s roast is pouring']::text[], '9316cff4-5bdd-4a20-a45c-2d96b67476ef'::uuid),
('a4444444-4444-4444-8444-444444444444'::uuid, 2, 'Café break', 'Sit-down café before the final city leg.', '10:30 AM – 11:30 AM', '~1 hr', 'Pay per Order', 'Sip & Snack', ARRAY[]::text[], 'Felize Cafe', 14.363722, 120.9058041, '', ARRAY['Sit down for a café plate before the city leg', 'Use this as the last long pause of the half day']::text[], '7fbde5ad-390a-41cf-becd-17d5fbfce07b'::uuid),
('a4444444-4444-4444-8444-444444444444'::uuid, 3, 'Museum close', 'End with indoor exhibits in Dasmariñas.', '11:45 AM – 12:45 PM', '~1 hr', 'Entrance Fee Required', '', ARRAY[]::text[], 'Museo De La Salle', 14.3209977, 120.9610387, '', ARRAY['Finish with indoor exhibits out of midday sun', 'Confirm visiting hours before you roll in']::text[], 'e9cc0be2-b7c3-4c68-81a3-79455a689a92'::uuid)
) AS v(itinerary_id, sort_order, name, description, time_window, duration_hint, cost_type, expect_tag, vibe_tags, venue_name, venue_lat, venue_lng, maps_url, highlights, place_id)
WHERE NOT EXISTS (SELECT 1 FROM public.itinerary_stops s WHERE s.itinerary_id = 'a4444444-4444-4444-8444-444444444444'::uuid);
