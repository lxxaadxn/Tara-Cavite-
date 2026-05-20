-- User reviews for establishments in public.places (Cavite catalog).
-- Apply in Supabase SQL Editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS public.place_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 4000),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT place_reviews_one_per_user UNIQUE (place_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_place_reviews_place_id
  ON public.place_reviews (place_id);

CREATE INDEX IF NOT EXISTS idx_place_reviews_user_id
  ON public.place_reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_place_reviews_place_published
  ON public.place_reviews (place_id, created_at DESC)
  WHERE is_published = true;

-- Aggregates for place detail / search sort (published reviews only).
CREATE OR REPLACE VIEW public.place_review_stats AS
SELECT
  place_id,
  COUNT(*)::integer AS review_count,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating
FROM public.place_reviews
WHERE is_published = true
GROUP BY place_id;

ALTER VIEW public.place_review_stats SET (security_invoker = true);

-- updated_at trigger (function from schema.sql)
DROP TRIGGER IF EXISTS update_place_reviews_updated_at ON public.place_reviews;
CREATE TRIGGER update_place_reviews_updated_at
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published place reviews" ON public.place_reviews;
CREATE POLICY "Anyone can read published place reviews"
  ON public.place_reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Users can read own place reviews" ON public.place_reviews;
CREATE POLICY "Users can read own place reviews"
  ON public.place_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create place reviews" ON public.place_reviews;
CREATE POLICY "Users can create place reviews"
  ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own unpublished place reviews" ON public.place_reviews;
CREATE POLICY "Users can update own place reviews"
  ON public.place_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own place reviews" ON public.place_reviews;
CREATE POLICY "Users can delete own place reviews"
  ON public.place_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.place_review_stats TO anon, authenticated;
