-- Allow authenticated admin portal sessions to CRUD STA membership rows.
-- Public catalog still reads via SELECT (anon + authenticated) and v_sta_v3_cavite_2025_catalog.

GRANT INSERT, UPDATE, DELETE ON public.sta_v3_cavite_2025 TO authenticated;

DROP POLICY IF EXISTS "Authenticated insert sta_v3_cavite_2025" ON public.sta_v3_cavite_2025;
CREATE POLICY "Authenticated insert sta_v3_cavite_2025"
  ON public.sta_v3_cavite_2025
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update sta_v3_cavite_2025" ON public.sta_v3_cavite_2025;
CREATE POLICY "Authenticated update sta_v3_cavite_2025"
  ON public.sta_v3_cavite_2025
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete sta_v3_cavite_2025" ON public.sta_v3_cavite_2025;
CREATE POLICY "Authenticated delete sta_v3_cavite_2025"
  ON public.sta_v3_cavite_2025
  FOR DELETE
  TO authenticated
  USING (true);
