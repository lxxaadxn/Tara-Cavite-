-- Extend existing sta_v3_cavite_2025 for UPDATED STA Excel (address + Maps links).
-- Apps list only rows with is_listed = true.

ALTER TABLE public.sta_v3_cavite_2025
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS highlight TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.sta_v3_cavite_2025
  DROP CONSTRAINT IF EXISTS sta_v3_cavite_2025_highlight_check;

ALTER TABLE public.sta_v3_cavite_2025
  ADD CONSTRAINT sta_v3_cavite_2025_highlight_check
  CHECK (highlight IN ('none', 'red', 'yellow'));

CREATE INDEX IF NOT EXISTS sta_v3_cavite_2025_is_listed_idx
  ON public.sta_v3_cavite_2025 (is_listed)
  WHERE is_listed = TRUE;
