-- Traveler profile extras: birthday, travel interests, accessibility notes.
-- Safe to re-run in the Supabase SQL Editor.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS favorite_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_lgus TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT;

COMMENT ON COLUMN public.user_profiles.birthday IS
  'Optional traveler birthday shown on the web profile.';

COMMENT ON COLUMN public.user_profiles.favorite_categories IS
  'Filter keys (e.g. cat-nature) the traveler marked as interests.';

COMMENT ON COLUMN public.user_profiles.preferred_lgus IS
  'LGU filter keys (e.g. city-tagaytay) the traveler prefers.';

COMMENT ON COLUMN public.user_profiles.accessibility_notes IS
  'Optional traveler notes about accessibility needs.';
