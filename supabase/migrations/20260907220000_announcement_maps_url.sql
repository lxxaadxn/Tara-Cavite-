-- Persist the Google Maps place link used for announcement “Open map”.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS maps_url TEXT;

COMMENT ON COLUMN public.announcements.maps_url IS
  'Optional Google Maps URL for the Open map action; lat/lng remain for pins.';

-- Backfill from existing coordinates when present.
UPDATE public.announcements
SET maps_url = concat(
  'https://www.google.com/maps/search/?api=1&query=',
  latitude::text,
  ',',
  longitude::text
)
WHERE maps_url IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;
