-- Traveler profile social bio, interest tags, cover banner, and social links.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS interest_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram TEXT,
  ADD COLUMN IF NOT EXISTS social_facebook TEXT,
  ADD COLUMN IF NOT EXISTS social_tiktok TEXT;

COMMENT ON COLUMN public.user_profiles.bio IS
  'Optional short traveler intro shown on the profile page.';
COMMENT ON COLUMN public.user_profiles.interest_tags IS
  'Lifestyle interest chips (e.g. Foodie, Coffee Lover) for recommendations.';
COMMENT ON COLUMN public.user_profiles.cover_url IS
  'Optional profile cover/banner image public URL.';
COMMENT ON COLUMN public.user_profiles.social_instagram IS
  'Optional Instagram profile URL.';
COMMENT ON COLUMN public.user_profiles.social_facebook IS
  'Optional Facebook profile URL.';
COMMENT ON COLUMN public.user_profiles.social_tiktok IS
  'Optional TikTok profile URL.';
