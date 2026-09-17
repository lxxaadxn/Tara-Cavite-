-- Admin hide/show/delete on traveler place_reviews.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) AND to_regclass('public.place_reviews') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins update place reviews" ON public.place_reviews;
      CREATE POLICY "Admins update place reviews"
        ON public.place_reviews FOR UPDATE
        TO authenticated
        USING (public.is_cavitour_session_admin())
        WITH CHECK (public.is_cavitour_session_admin());
    $policy$;
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins delete place reviews" ON public.place_reviews;
      CREATE POLICY "Admins delete place reviews"
        ON public.place_reviews FOR DELETE
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;
