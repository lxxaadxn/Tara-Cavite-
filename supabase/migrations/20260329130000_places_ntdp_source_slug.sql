-- Align app with LGU STA inventory: NTDP category + stable source slug for upserts
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS ntdp_category TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS source_slug TEXT;

-- Multiple NULL source_slugs allowed; non-null slugs must be unique (for STA upserts).
CREATE UNIQUE INDEX IF NOT EXISTS places_source_slug_uidx ON public.places (source_slug);
