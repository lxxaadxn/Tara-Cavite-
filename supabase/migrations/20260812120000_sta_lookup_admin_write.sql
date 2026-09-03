-- Allow authenticated admin sessions to CRUD STA lookup taxonomies
-- (Categories/Filters admin page). Public read policies remain unchanged.

GRANT INSERT, UPDATE, DELETE ON public.ntdp_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ta_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.type_codes TO authenticated;

-- Sequences used by serial PKs on insert
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'ntdp_categories_ntdp_category_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.ntdp_categories_ntdp_category_id_seq TO authenticated;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'ta_categories_category_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.ta_categories_category_id_seq TO authenticated;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'type_codes_type_code_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.type_codes_type_code_id_seq TO authenticated;
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated insert ntdp_categories" ON public.ntdp_categories;
CREATE POLICY "Authenticated insert ntdp_categories"
  ON public.ntdp_categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update ntdp_categories" ON public.ntdp_categories;
CREATE POLICY "Authenticated update ntdp_categories"
  ON public.ntdp_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete ntdp_categories" ON public.ntdp_categories;
CREATE POLICY "Authenticated delete ntdp_categories"
  ON public.ntdp_categories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert ta_categories" ON public.ta_categories;
CREATE POLICY "Authenticated insert ta_categories"
  ON public.ta_categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update ta_categories" ON public.ta_categories;
CREATE POLICY "Authenticated update ta_categories"
  ON public.ta_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete ta_categories" ON public.ta_categories;
CREATE POLICY "Authenticated delete ta_categories"
  ON public.ta_categories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert type_codes" ON public.type_codes;
CREATE POLICY "Authenticated insert type_codes"
  ON public.type_codes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update type_codes" ON public.type_codes;
CREATE POLICY "Authenticated update type_codes"
  ON public.type_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete type_codes" ON public.type_codes;
CREATE POLICY "Authenticated delete type_codes"
  ON public.type_codes FOR DELETE TO authenticated USING (true);
