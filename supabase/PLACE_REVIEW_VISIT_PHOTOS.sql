-- Visit-gated place reviews + optional photos (max 4).
-- Run in the Supabase SQL Editor (safe to re-run).
-- A review requires a QR or code check-in in place_visits for the same place.

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_photo_urls_len;

ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_photo_urls_len
  CHECK (COALESCE(cardinality(photo_urls), 0) <= 4);

DROP POLICY IF EXISTS "Users can create place reviews" ON public.place_reviews;
CREATE POLICY "Users can create place reviews"
  ON public.place_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.place_visits v
      WHERE v.user_id = auth.uid()
        AND v.place_id = place_reviews.place_id
        AND v.source IN ('qr', 'code')
    )
  );

DROP POLICY IF EXISTS "Users can update own place reviews" ON public.place_reviews;
CREATE POLICY "Users can update own place reviews"
  ON public.place_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.place_visits v
      WHERE v.user_id = auth.uid()
        AND v.place_id = place_reviews.place_id
        AND v.source IN ('qr', 'code')
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read review-photos" ON storage.objects;
CREATE POLICY "Public read review-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "Users upload own review-photos" ON storage.objects;
CREATE POLICY "Users upload own review-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own review-photos" ON storage.objects;
CREATE POLICY "Users update own review-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own review-photos" ON storage.objects;
CREATE POLICY "Users delete own review-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
