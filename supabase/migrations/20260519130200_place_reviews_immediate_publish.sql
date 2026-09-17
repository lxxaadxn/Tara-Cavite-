-- Publish all reviews immediately (no moderation / approval step).

ALTER TABLE public.place_reviews
  ALTER COLUMN is_published SET DEFAULT true;

UPDATE public.place_reviews
SET is_published = true
WHERE is_published = false;

CREATE OR REPLACE FUNCTION public.place_reviews_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS place_reviews_before_write ON public.place_reviews;
CREATE TRIGGER place_reviews_before_write
  BEFORE INSERT OR UPDATE OF rating, body ON public.place_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.place_reviews_before_write();

DROP POLICY IF EXISTS "Users can create place reviews" ON public.place_reviews;
CREATE POLICY "Users can create place reviews"
  ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own unpublished place reviews" ON public.place_reviews;
DROP POLICY IF EXISTS "Users can update own place reviews" ON public.place_reviews;
CREATE POLICY "Users can update own place reviews"
  ON public.place_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
