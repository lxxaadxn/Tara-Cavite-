-- Event timing, venue/map coordinates, and scheduled-publish visibility.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS event_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN public.announcements.event_starts_at IS
  'When the event begins (distinct from published_at go-live time).';
COMMENT ON COLUMN public.announcements.event_ends_at IS
  'Optional event end time.';
COMMENT ON COLUMN public.announcements.venue_name IS
  'Optional specific venue (e.g. park or hall name).';
COMMENT ON COLUMN public.announcements.latitude IS
  'Optional venue latitude for map links.';
COMMENT ON COLUMN public.announcements.longitude IS
  'Optional venue longitude for map links.';

-- Allow scheduled posts: keep a future published_at when is_published is true.
-- Drafts still clear published_at so they never appear as live.
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

-- Travelers only see published rows that have already gone live.
DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.announcements;
CREATE POLICY "Anyone can read published announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (
    is_published = TRUE
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  );
