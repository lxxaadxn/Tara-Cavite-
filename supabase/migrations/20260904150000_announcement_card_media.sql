-- Optional cover image + external register/action link for announcement cards.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT;

COMMENT ON COLUMN public.announcements.image_url IS
  'Optional cover image URL for the traveler announcement card.';

COMMENT ON COLUMN public.announcements.action_url IS
  'Optional external URL for a Register / CTA button on the traveler card.';
