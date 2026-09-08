-- Establishment owner portal: analytics, listing content, and review reports.
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- Why this exists: owns_establishment_place() used to read establishment_owner_places,
-- a join table no app code ever writes to, and get_my_establishment_visit_stats()
-- still joined tourist_attractions, which the STA collapse migration dropped. Both
-- are repointed at establishment_owners.sta_place_id, the link the invite trigger
-- actually populates.

-- ---------------------------------------------------------------------------
-- 1) Owner -> place link
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owns_establishment_place(
  p_place_id UUID,
  uid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- The live link: one owner, one catalog row, set on invite.
    SELECT 1
    FROM public.establishment_owners o
    WHERE o.id = uid
      AND o.sta_place_id = p_place_id
      AND o.account_status = 'active'
      AND o.verification_status IN ('approved', 'under_review', 'pending')
    UNION ALL
    -- Legacy join table, kept for future multi-venue owners.
    SELECT 1
    FROM public.establishment_owner_places l
    JOIN public.establishment_owners o2 ON o2.id = l.owner_id
    WHERE l.place_id = p_place_id
      AND l.owner_id = uid
      AND o2.account_status = 'active'
      AND o2.verification_status IN ('approved', 'under_review', 'pending')
  );
$$;

REVOKE ALL ON FUNCTION public.owns_establishment_place(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_establishment_place(UUID, UUID) TO authenticated, anon;

-- Storage object paths are place-images/{sta_place_id}/file.jpg. The cast has to
-- happen inside a function so a non-UUID folder name returns false instead of erroring.
CREATE OR REPLACE FUNCTION public.owns_establishment_place_folder(p_folder TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  place_id UUID;
BEGIN
  BEGIN
    place_id := p_folder::UUID;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;
  RETURN public.owns_establishment_place(place_id);
END;
$$;

REVOKE ALL ON FUNCTION public.owns_establishment_place_folder(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_establishment_place_folder(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Visit stats RPC, rebuilt on sta_v3_cavite_2025
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_establishment_visit_stats()
RETURNS TABLE (
  place_id UUID,
  place_name TEXT,
  checkin_code TEXT,
  total_visits BIGINT,
  qr_visits BIGINT,
  destination_reached_visits BIGINT,
  last_visit_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  -- Platform admin: every catalog row.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) AND public.is_cavitour_session_admin() THEN
    RETURN QUERY
    SELECT
      s.id,
      s.ta_name,
      c.code,
      COALESCE(vc.total_visits, 0),
      COALESCE(vc.qr_visits, 0),
      COALESCE(vc.destination_reached_visits, 0),
      vc.last_visit_at
    FROM public.sta_v3_cavite_2025 s
    LEFT JOIN public.place_checkin_codes c ON c.place_id = s.id
    LEFT JOIN public.v_place_visit_counts vc ON vc.place_id = s.id
    ORDER BY COALESCE(vc.total_visits, 0) DESC, s.ta_name;
    RETURN;
  END IF;

  -- Establishment owner: only their own catalog row.
  RETURN QUERY
  SELECT
    s.id,
    s.ta_name,
    c.code,
    COALESCE(vc.total_visits, 0),
    COALESCE(vc.qr_visits, 0),
    COALESCE(vc.destination_reached_visits, 0),
    vc.last_visit_at
  FROM public.establishment_owners o
  JOIN public.sta_v3_cavite_2025 s ON s.id = o.sta_place_id
  LEFT JOIN public.place_checkin_codes c ON c.place_id = s.id
  LEFT JOIN public.v_place_visit_counts vc ON vc.place_id = s.id
  WHERE o.id = uid
    AND o.account_status = 'active'
  ORDER BY COALESCE(vc.total_visits, 0) DESC, s.ta_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_establishment_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_establishment_visit_stats() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2b) Where this place ranks by visits
--     The owner dashboard shows the same standing the admin Export reports
--     page lists under "Most visited destinations": every place_visits row in
--     the range, tallied per place, ordered by count. An owner's RLS only
--     exposes their own visits, so the tally has to run here, and only their
--     own position comes back — never another establishment's numbers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_establishment_visit_rank(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  place_rank INT,
  visit_count BIGINT,
  ranked_places INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  target UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT o.sta_place_id INTO target
  FROM public.establishment_owners o
  WHERE o.id = uid
    AND o.account_status = 'active';

  IF target IS NULL THEN
    RETURN QUERY SELECT 0, 0::BIGINT, 0;
    RETURN;
  END IF;

  RETURN QUERY
  WITH tally AS (
    SELECT v.place_id AS pid, COUNT(*)::BIGINT AS hits
    FROM public.place_visits v
    WHERE (p_from IS NULL OR v.created_at >= p_from)
      AND (p_to IS NULL OR v.created_at <= p_to)
    GROUP BY v.place_id
  ), mine AS (
    SELECT t.hits FROM tally t WHERE t.pid = target
  )
  SELECT
    -- No visits in the range means no row on the admin list either, so report
    -- no rank rather than a flattering last place.
    CASE
      WHEN COALESCE((SELECT m.hits FROM mine m), 0) = 0 THEN 0
      ELSE (SELECT COUNT(*)::INT + 1 FROM tally t WHERE t.hits > (SELECT m.hits FROM mine m))
    END,
    COALESCE((SELECT m.hits FROM mine m), 0::BIGINT),
    (SELECT COUNT(*)::INT FROM tally);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_establishment_visit_rank(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_establishment_visit_rank(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Owners read reviews for their own place, including hidden ones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners read reviews for their places" ON public.place_reviews;
CREATE POLICY "Owners read reviews for their places"
  ON public.place_reviews FOR SELECT
  TO authenticated
  USING (public.owns_establishment_place(place_id));

-- ---------------------------------------------------------------------------
-- 4) Owner-safe listing content write
--    RLS cannot restrict columns, and owners must never set is_listed,
--    highlight, or ntdp_category directly, so content writes go through this
--    RPC. is_listed is recomputed here from the values the owner may edit.
-- ---------------------------------------------------------------------------
-- Adding the address and location arguments changes the signature, so the older
-- overloads have to go or named-argument calls from the client turn ambiguous.
DROP FUNCTION IF EXISTS public.update_my_establishment_listing(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_my_establishment_listing(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.update_my_establishment_listing(
  p_description TEXT DEFAULT NULL,
  p_gallery_urls TEXT[] DEFAULT '{}',
  p_opening_hours TEXT DEFAULT NULL,
  p_closing_hours TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_google_maps_link TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  target UUID;
  gallery TEXT[];
  new_address TEXT;
  maps_link TEXT;
  new_lat DOUBLE PRECISION;
  new_lng DOUBLE PRECISION;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT o.sta_place_id INTO target
  FROM public.establishment_owners o
  WHERE o.id = uid
    AND o.account_status = 'active';

  IF target IS NULL THEN
    RAISE EXCEPTION 'No establishment listing is linked to this account yet.';
  END IF;

  -- Drop blanks and duplicates while keeping the order the owner arranged.
  SELECT COALESCE(array_agg(url ORDER BY ord), '{}')
    INTO gallery
  FROM (
    SELECT trim(u) AS url, MIN(ord) AS ord
    FROM unnest(COALESCE(p_gallery_urls, '{}')) WITH ORDINALITY AS t(u, ord)
    WHERE COALESCE(trim(u), '') <> ''
    GROUP BY trim(u)
  ) deduped;

  -- Where the place is is an adjustment, never a deletion: a blank or NULL
  -- argument keeps whatever the tourism office already set, so a stale client
  -- cannot wipe the address or the pin.
  SELECT
    COALESCE(NULLIF(trim(COALESCE(p_address, '')), ''), s.address),
    COALESCE(NULLIF(trim(COALESCE(p_google_maps_link, '')), ''), s.google_maps_link),
    COALESCE(p_latitude, s.latitude),
    COALESCE(p_longitude, s.longitude)
    INTO new_address, maps_link, new_lat, new_lng
  FROM public.sta_v3_cavite_2025 s
  WHERE s.id = target;

  UPDATE public.sta_v3_cavite_2025 s
  SET
    description = NULLIF(trim(COALESCE(p_description, '')), ''),
    gallery_urls = gallery,
    -- The cover photo is simply the first gallery entry.
    picture = gallery[1],
    opening_hours = NULLIF(trim(COALESCE(p_opening_hours, '')), '')::TIME,
    closing_hours = NULLIF(trim(COALESCE(p_closing_hours, '')), '')::TIME,
    phone = NULLIF(trim(COALESCE(p_phone, '')), ''),
    email = NULLIF(trim(COALESCE(p_email, '')), ''),
    website = NULLIF(trim(COALESCE(p_website, '')), ''),
    address = new_address,
    google_maps_link = maps_link,
    latitude = new_lat,
    longitude = new_lng,
    -- Mirrors computeIsListed in the admin catalog helpers, which is the only
    -- other place that flips this. highlight stays owner-proof either way.
    is_listed = (
      COALESCE(trim(new_address), '') <> ''
      AND COALESCE(maps_link, '') ~* '(google\.com/maps|maps\.app\.goo\.gl|goo\.gl/maps)'
      AND COALESCE(s.highlight, 'none') = 'none'
    )
  WHERE s.id = target;

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_establishment_listing(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_establishment_listing(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Review reports raised by owners
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.place_reviews(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, owner_id)
);

COMMENT ON TABLE public.place_review_reports IS
  'An establishment owner flagged a review on their listing for admin attention.';

ALTER TABLE public.place_review_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.place_review_reports TO authenticated;

DROP POLICY IF EXISTS "Owners read own review reports" ON public.place_review_reports;
CREATE POLICY "Owners read own review reports"
  ON public.place_review_reports FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners raise review reports" ON public.place_review_reports;
CREATE POLICY "Owners raise review reports"
  ON public.place_review_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.place_reviews r
      WHERE r.id = review_id
        AND public.owns_establishment_place(r.place_id)
    )
  );

DROP POLICY IF EXISTS "Admins read review reports" ON public.place_review_reports;
DROP POLICY IF EXISTS "Admins update review reports" ON public.place_review_reports;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins read review reports"
        ON public.place_review_reports FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admins update review reports"
        ON public.place_review_reports FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin())
    $policy$;
    EXECUTE 'GRANT UPDATE ON public.place_review_reports TO authenticated';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6) A report rings the admin bell (needs ADMIN_NOTIFICATIONS.sql first)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_notifications'
  ) THEN
    -- Widen the kind check to admit the new event.
    ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_kind_check;
    ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_kind_check
      CHECK (kind IN ('establishment_announcement', 'establishment_activated', 'review_reported'));

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.notify_admins_review_reported()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        owner_name TEXT;
      BEGIN
        SELECT COALESCE(NULLIF(TRIM(o.business_name), ''), NULLIF(TRIM(o.full_name), ''), o.email)
          INTO owner_name
        FROM public.establishment_owners o
        WHERE o.id = NEW.owner_id;

        INSERT INTO public.admin_notifications (kind, title, body, establishment_owner_id)
        VALUES (
          'review_reported',
          COALESCE(owner_name, 'An establishment') || ' reported a review',
          NEW.reason,
          NEW.owner_id
        );

        RETURN NEW;
      END;
      $body$;
    $fn$;

    DROP TRIGGER IF EXISTS place_review_reports_notify_admins ON public.place_review_reports;
    CREATE TRIGGER place_review_reports_notify_admins
      AFTER INSERT ON public.place_review_reports
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_admins_review_reported();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7) Storage: owners manage photos under place-images/{sta_place_id}/
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners upload own place-images" ON storage.objects;
CREATE POLICY "Owners upload own place-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-images'
    AND public.owns_establishment_place_folder((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Owners update own place-images" ON storage.objects;
CREATE POLICY "Owners update own place-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'place-images'
    AND public.owns_establishment_place_folder((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'place-images'
    AND public.owns_establishment_place_folder((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Owners delete own place-images" ON storage.objects;
CREATE POLICY "Owners delete own place-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'place-images'
    AND public.owns_establishment_place_folder((storage.foldername(name))[1])
  );

-- ---------------------------------------------------------------------------
-- 8) Verify
-- ---------------------------------------------------------------------------
-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND proname IN ('owns_establishment_place', 'get_my_establishment_visit_stats', 'update_my_establishment_listing');
--
-- SELECT policyname, tablename FROM pg_policies
-- WHERE policyname IN ('Owners read reviews for their places', 'Owners read visits for their places', 'Owners upload own place-images');
--
-- SELECT * FROM public.get_my_establishment_visit_stats();
