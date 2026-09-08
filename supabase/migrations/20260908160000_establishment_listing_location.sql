-- Let establishment owners set their own address, Google Maps link and pin
-- position, and recompute is_listed from them so filling those in actually
-- publishes the listing.
-- Safe to re-run in the Supabase SQL Editor.

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
