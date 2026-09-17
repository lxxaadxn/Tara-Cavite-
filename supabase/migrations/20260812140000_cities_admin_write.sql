-- Allow authenticated admin sessions to CRUD public.cities
-- (Municipalities admin page). Public read policies remain unchanged.

GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'cities_city_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.cities_city_id_seq TO authenticated;
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated insert cities" ON public.cities;
CREATE POLICY "Authenticated insert cities"
  ON public.cities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update cities" ON public.cities;
CREATE POLICY "Authenticated update cities"
  ON public.cities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete cities" ON public.cities;
CREATE POLICY "Authenticated delete cities"
  ON public.cities FOR DELETE TO authenticated USING (true);
