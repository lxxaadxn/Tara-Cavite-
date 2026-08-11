-- Archive / staging flat table from STA-v3 Cavite 2025 Excel.
-- Does NOT replace public.tourist_attractions (live app catalog).

CREATE TABLE IF NOT EXISTS public.sta_v3_cavite_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name TEXT NOT NULL,
  row_no INTEGER,
  ta_name TEXT NOT NULL,
  type_code TEXT,
  ta_category TEXT,
  ntdp_category TEXT,
  year_est INTEGER,
  region TEXT,
  prov_huc TEXT,
  city_mun TEXT,
  barangay TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sta_v3_cavite_2025_city_mun_idx
  ON public.sta_v3_cavite_2025 (city_mun);

CREATE INDEX IF NOT EXISTS sta_v3_cavite_2025_ta_name_idx
  ON public.sta_v3_cavite_2025 (ta_name);

ALTER TABLE public.sta_v3_cavite_2025 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sta_v3_cavite_2025" ON public.sta_v3_cavite_2025;
CREATE POLICY "Public read sta_v3_cavite_2025"
  ON public.sta_v3_cavite_2025
  FOR SELECT
  USING (true);

GRANT SELECT ON public.sta_v3_cavite_2025 TO anon, authenticated;
