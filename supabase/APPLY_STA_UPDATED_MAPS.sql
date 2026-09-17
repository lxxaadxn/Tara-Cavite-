-- One-shot apply: create STA table (if missing) + maps fields + seed + catalog view
-- Paste into Supabase SQL Editor and Run.

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


-- Seed public.sta_v3_cavite_2025 from UPDATED STA Excel (import-sta-v3-flat-table.mjs)
-- is_listed gates web/mobile visibility.
BEGIN;
TRUNCATE public.sta_v3_cavite_2025;

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Amadeo',
  1,
  'MSSL Resort and Balite Falls',
  'Nature',
  '102 Falls',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Amadeo',
  'Banay-banay',
  'Balite Rd., Amadeo, Cavite',
  'https://www.google.com/maps/place/M.S.S.L.+Balite+Falls+Resort/@14.2114079,120.9198145,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7f3684c1fc63:0xe7b993d3f53cad89!8m2!3d14.2114027!4d120.9223894!16s%2Fg%2F11cn9dsfn_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2114027,
  120.9223894,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Amadeo',
  2,
  'Coffee Culture and Heritage Mural Project',
  'History and Culture',
  '299 Other Historical or cultural attractions',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Amadeo',
  'Brgy.4',
  'Amadeo, 4119 Cavite',
  'https://www.google.com/maps/place/Amadeo+Coffee+Culture+and+Heritage+Mural/@14.1733137,120.922987,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7938acdbe7eb:0x2251706318ae0ba9!8m2!3d14.1733085!4d120.9255619!16s%2Fg%2F11pg2vc84g?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.1733085,
  120.9255619,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  1,
  'Patricia''s Patricio''s',
  'Special Events',
  '799 Other Events',
  'MICE and Events Tourism',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Sta. Teresa',
  'Purok 3 Brgy Sta Theresa, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Patricias+Patricios+Events+Place/@14.1302232,120.8203082,17.25z/data=!4m6!3m5!1s0x33bd9d526a537bc3:0x7362aebee4299e44!8m2!3d14.1302041!4d120.8229957!16s%2Fg%2F11q9j7qwpn?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.1302041,
  120.8229957,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  2,
  'Kainan sa Sagingan',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Marahan II',
  'Mangas II, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Kainan+sa+Sagingan/@14.1127579,120.8585858,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9d567046df69:0x92369eb034139fb9!8m2!3d14.1127527!4d120.8611607!16s%2Fg%2F11js9zlcs1?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.1127527,
  120.8611607,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  3,
  'Asador',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Esperanza Ilaya',
  'Lot-3308 Barangay road, Esperanza Ilaya, Alfonso, 4100 Cavite',
  'https://www.google.com/maps/place/Asador+Alfonso/@14.1128038,120.8405611,14z/data=!4m10!1m2!2m1!1sasador!3m6!1s0x33bd9d117751e70f:0x48a02c9eb3c61e57!8m2!3d14.1113594!4d120.8827737!15sCgZhc2Fkb3JaCCIGYXNhZG9ykgEKcmVzdGF1cmFudJoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQyMDFRMDVHT0RWT00yd3dVakJHZWs1WE1ERmhWVkl3WVVSU1JHUlhZeEFC4AEA-gEFCLgEEC8!16s%2Fg%2F11stgb44j_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.1113594,
  120.8827737,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  4,
  'Teresitoz',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Espeanza Ilaya',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  5,
  'CafÃ© Jeriah',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Sta. Teresa',
  '9043 Brgy, Santa Teresa, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Caf%C3%A9+Jeriah+Main/@14.1296808,120.8002857,14.25z/data=!4m10!1m2!2m1!1scafe+jireh+alfonso!3m6!1s0x33bd9d500b0c91b9:0xbbb6ad81e3f66319!8m2!3d14.1299142!4d120.8244629!15sChJjYWZlIGppcmVoIGFsZm9uc29aFCISY2FmZSBqaXJlaCBhbGZvbnNvkgEEY2FmZeABAA!16s%2Fg%2F11y370zc85?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.1299142,
  120.8244629,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  6,
  'Bene Clinic',
  'Health and Wellness',
  '804 Hospital/Clinics/Medical Tourism Facilities',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Sikat',
  'Taal Silangan, Purok 4, Bgy Sikat Barangay, Sikat Rd, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/The+Bene+Clinic/@14.0892741,120.8922062,20z/data=!4m6!3m5!1s0x33bd83ea46b58b19:0xdb03aafcabe0343!8m2!3d14.0893746!4d120.8926213!16s%2Fg%2F11kmmzmrkp?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.0893746,
  120.8926213,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  7,
  'Tagpuan sa Kabukiran',
  'Others',
  '799 Other Events',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Sikat',
  '184 Sikat Rd, Alfonso, Cavite',
  'https://www.google.com/maps/place/Tagpuan+sa+Kabukiran/@14.0936936,120.8879477,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9d006139458b:0x508a27260fe516f!8m2!3d14.0936884!4d120.8905226!16s%2Fg%2F11x5p2p616?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.0936884,
  120.8905226,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  8,
  'Arocarria',
  'Special Events',
  '799 Other Events',
  'MICE and Events Tourism',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Sikat',
  'Purok 5, Barangay, Sikat Rd, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Arocarr%C3%ADa+-+Receptions+at+Alfonso/@14.0900504,120.8834172,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9dcfd06599d3:0xccbe8442a6c3b478!8m2!3d14.0900452!4d120.8859921!16s%2Fg%2F11pd0hnpx4?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.0900452,
  120.8859921,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  9,
  'Nature''s Dinner',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Luksuhin Ilaya',
  'Bangladesh St, Luksuhin Ilaya, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Nature''s+Diner/@14.0860795,120.8773118,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9d8c49ccbf03:0x3bb110ab6773786b!8m2!3d14.0860743!4d120.8798867!16s%2Fg%2F11l1q6ptcr?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.0860743,
  120.8798867,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Alfonso',
  10,
  'Kashing''s Bistro',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  NULL,
  NULL,
  'Alfonso',
  'Luksuhin Ilaya',
  'KM 67 Tagaytay - Nasugbu Hwy, Alfonso, 4123 Cavite',
  'https://www.google.com/maps/place/Kashing''s+Bistro/@14.0838605,120.8749026,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9dab0bbcd4ad:0x41ad107fb9c0bbc8!8m2!3d14.0838553!4d120.8774775!16s%2Fg%2F11tg3l921m?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.0838553,
  120.8774775,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  1,
  'Tulay Zapote',
  'History and Culture',
  'Historical Site',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Zapote III',
  'Emilio Aguinaldo Hwy, Bacoor, Metro Manila',
  'https://www.google.com/maps/place/Battle+of+Zapote+Bridge+Monument/@14.4639407,120.9653287,18.79z/data=!4m14!1m7!3m6!1s0x3397cdeb6b3c7545:0x50496a48d35e1a37!2sTulay+ng+Pinaglabanan!8m2!3d14.4640149!4d120.9663616!16s%2Fg%2F11cmnkg3k1!3m5!1s0x3397cdeb6b74b66d:0x80d241979d5c4ebb!8m2!3d14.4638646!4d120.9662295!16s%2Fg%2F12ml2n83n?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4640149,
  120.9663616,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  2,
  'Cuenca Ancestral House',
  'History and Culture',
  'Heritage Houses/Vernacular Architecture',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Digman',
  '12 Gen. Evangelista Street, Bacoor, Cavite',
  'https://www.google.com/maps/place/Cuenca+Ancestral+House/@14.4596526,120.9402479,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd17b7a2e2ff:0x8da4f5849b168a4e!8m2!3d14.4596474!4d120.9428228!16s%2Fg%2F11kj883mn3?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4596474,
  120.9428228,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  3,
  'Tomb of Gen. Edilberto Evangelista',
  'History and Culture',
  'Burial Site',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Ligas I',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  4,
  'St. Michael the Archangel Parish',
  'History and Culture',
  'Churches, Temples, and Places of Worship',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Tabing Dagat',
  'Gen. Evangelista Street, Tabing Dagat, Bacoor, 4102 Cavite',
  'https://www.google.com/maps/place/St.+Michael+the+Archangel+Parish/@14.4596683,120.9373716,17z/data=!4m10!1m2!2m1!1sSt.+Michael+the+Archangel+Parish!3m6!1s0x3397cd784632e5db:0x7d6becf4ec459818!8m2!3d14.459695!4d120.9396989!15sCiBTdC4gTWljaGFlbCB0aGUgQXJjaGFuZ2VsIFBhcmlzaFohIh9zdCBtaWNoYWVsIHRoZSBhcmNoYW5nZWwgcGFyaXNokgEPY2F0aG9saWNfY2h1cmNomgEjQ2haRFNVaE5NRzluUzBWSlEwRm5UVU5aTm1OeVFrZEJFQUXgAQD6AQUIjgIQSw!16s%2Fg%2F1tgnzbd7?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.459695,
  120.9396989,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  5,
  'Plaza de Padre Mariano Gomes',
  'History and Culture',
  'Monuments and Markers',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Tabing Dagat',
  'Gen. Evangelista Street, Bacoor, Cavite',
  'https://www.google.com/maps/place/Plaza+de+Padre+Mariano+Gomes/@14.4596206,120.9376233,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd7842ccbd0d:0xd43c2b7dab209a41!8m2!3d14.4596154!4d120.9401982!16s%2Fg%2F11gbwnzzrd?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4596154,
  120.9401982,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  6,
  'Monument of Love',
  'History and Culture',
  'Monuments and Markers',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Salinas I',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  7,
  'General Edilberto Evangelista Monument',
  'History and Culture',
  'Monuments and Markers',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Zapote III',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  8,
  'St. Ezekiel Moreno Park',
  'History and Culture',
  'Park',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'San Nicolas I',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  9,
  'Ginintuang Kasaysayan ng Lungsod ng Bacoor',
  'History and Culture',
  'Monuments and Markers',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Bayanan',
  'New Bacoor City Hall Access Rd, Bacoor, Cavite',
  'https://www.google.com/maps/place/Ginintuang+Kasaysayan+ng+Lungsod+ng+Bacoor/@14.4308825,120.9623615,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d34cfb7c8435:0x8cd95a830a8df8c7!8m2!3d14.4308774!4d120.9672324!16s%2Fg%2F11fmzc7dft?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4308774,
  120.9672324,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  10,
  'Mariano Navarette Ancestral House',
  'History and Culture',
  'Heritage Houses/Vernacular Architecture',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Sineguelasan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  11,
  'Barcega Family Heritage House',
  'History and Culture',
  'Heritage Houses/Vernacular Architecture',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Mabolo II',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  12,
  'One Asia Heritage',
  'History and Culture',
  'Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Talaba IV',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  13,
  'Justice Buenaventura A. Ocampo Ancestral House',
  'History and Culture',
  'Heritage Houses/Vernacular Architecture',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Digman',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  14,
  'Ricardo Fernandez Ancestral House',
  'History and Culture',
  'Heritage Houses/Vernacular Architecture',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Tabing Dagat',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  15,
  'Kademyahan ng Anak Zapote Band',
  'History and Culture',
  'Rehearsal Studio',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Digman',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  16,
  'Kademyahan ng Dâ€™ Original Band',
  'History and Culture',
  'Rehearsal Studio',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Digman',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  17,
  'Iglesia Filipina Independente - Cathedral of St. Michael the Archangel',
  'History and Culture',
  'Churches, Temples, and Places of Worship',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Digman',
  '064 Prof, H.F. Rubio St, Bacoor, Cavite',
  'https://www.google.com/maps/place/Iglesia+Filipina+Independiente+-+Cathedral+of+St.+Michael+the+Archangel/@14.4602404,120.939246,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd82a0c4fc83:0xc7fe995a46123bb!8m2!3d14.4602352!4d120.9418209!16s%2Fg%2F11fx8dmwp0?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4602352,
  120.9418209,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  18,
  'Evangelical Christian Church - Bacoor',
  'History and Culture',
  'Churches, Temples, and Places of Worship',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Banalo',
  'Gen. Evagelista Street, Bacoor',
  'https://www.google.com/maps/place/Evangelical+Christian+Church/@14.4575954,120.9319062,17z/data=!4m15!1m8!3m7!1s0x3397cd7c9e400001:0xc80e32772ea47b7e!2sEvangelical+Christian+Church!8m2!3d14.4573473!4d120.9319639!10e5!16s%2Fg%2F11sscsdrhk!3m5!1s0x3397cd7c9e400001:0xc80e32772ea47b7e!8m2!3d14.4573473!4d120.9319639!16s%2Fg%2F11sscsdrhk?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4573473,
  120.9319639,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  19,
  'Senyongâ€™s Museum',
  'History and Culture',
  'Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Bayanan',
  '130 Bayanan Rd, Bacoor, 4102 Cavite',
  'https://www.google.com/maps/place/Senyong''s+Garden+Events+and+Party+Venue/@14.4244005,120.9652388,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d23fcd62890f:0x37c873630c8e4e2f!8m2!3d14.4243953!4d120.9678137!16s%2Fg%2F11bzw1k9xb?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4243953,
  120.9678137,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  20,
  'Molino Dam',
  'History and Culture',
  'Government Structures, Private Structures, and Commercial Establishments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Molino III',
  '260 Molino Rd, Molino III, Bacoor, 4102 Cavite',
  'https://www.google.com/maps/place/Molino+Dam/@14.4184949,120.9568444,14z/data=!4m10!1m2!2m1!1sMolino+Dam!3m6!1s0x3397d3d17bd3217b:0xb3230b079ed84c54!8m2!3d14.3983838!4d120.9794189!15sCgpNb2xpbm8gRGFtkgEPZWNvbG9naWNhbF9wYXJr4AEA!16s%2Fg%2F11c1r7pmdm?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3983838,
  120.9794189,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  21,
  'Prinza Dam',
  'History and Culture',
  'Government Structures, Private Structures, and Commercial Establishments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'San Nicolas I',
  'Bacoor, 1747 Metro Manila',
  'https://www.google.com/maps/place/Prinza+San+Nicolas/@14.4385278,120.973938,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d20f775b69ff:0x2adae5a8ad45fb32!8m2!3d14.4385247!4d120.9754691!16s%2Fm%2F010lrrzm?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4385247,
  120.9754691,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  22,
  'Bacoor Family Eco Park',
  'Sports and Recreation Facilities',
  'Park',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Molino V',
  '21 Dela Cruz Street Phase II-A, Bacoor, Cavite',
  'https://www.google.com/maps/place/Bacoor+Eco+Park/@14.3987443,120.9704479,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3ce8bbdc007:0xb933ef15d197bd0c!8m2!3d14.3987391!4d120.9730228!16s%2Fg%2F1v96j9qh?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3987391,
  120.9730228,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  23,
  'Mangrove Plantation',
  'Nature',
  'Natural Geological and Physiographical / Land  Formations',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Sineguelasan',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  24,
  'Our Lady of Queen of Peace Parish Church',
  'History and Culture',
  'Churches, Temples, and Places of Worship',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Area B, Queens Row West',
  'BLk 1 Lot 6, Area B Santan, Queens Row West, Bacoor, 4102 Cavite',
  'https://www.google.com/maps/place/Our+Lady+Queen+of+Peace+Parish+(Queens+Row+West)+-+Diocese+of+Imus/@14.398829,120.931823,13z/data=!4m10!1m2!2m1!1sOur+Lady+of+Queen+of+Peace+Parish+Church!3m6!1s0x3397d3822f95f291:0xd9bbda4b1b858900!8m2!3d14.4029799!4d120.984847!15sCihPdXIgTGFkeSBvZiBRdWVlbiBvZiBQZWFjZSBQYXJpc2ggQ2h1cmNoWioiKG91ciBsYWR5IG9mIHF1ZWVuIG9mIHBlYWNlIHBhcmlzaCBjaHVyY2iSAQ9jYXRob2xpY19jaHVyY2iaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjAxVjAwelpGQmtla3BDWW1wR1ZscHVSbTlXUldoNldqSnNkMUpGUlJBQuABAPoBBAgAEB4!16s%2Fg%2F11smtxbg1k?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4029799,
  120.984847,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  25,
  'Community Fish Landing Center',
  'Industrial Tourism',
  'Government Structures, Private Structures, and Commercial Establishments',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Sineguelasan',
  'Sineguelasan, Bacoor, Cavite',
  'https://www.google.com/maps/place/Community+Fish+Landing+Center/@14.4574797,120.5276769,10z/data=!4m10!1m2!2m1!1sCommunity+Fish+Landing+Center!3m6!1s0x3397cd7b1ef6bdb7:0xf3b315ae7281ce43!8m2!3d14.4598974!4d120.9320178!15sCh1Db21tdW5pdHkgRmlzaCBMYW5kaW5nIENlbnRlclofIh1jb21tdW5pdHkgZmlzaCBsYW5kaW5nIGNlbnRlcpIBDnNlYWZvb2RfbWFya2V04AEA!16s%2Fg%2F11qk2pjj_1?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4598974,
  120.9320178,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  26,
  'Musiko',
  'Customs and Traditions',
  'Customs and Traditions',
  'Customs and Traditions',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'City of Bacoor',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  27,
  'Senakulo',
  'Customs and Traditions',
  'Customs and Traditions',
  'Customs and Traditions',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'San Nicolas I',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  28,
  'St. NiÃ±o de Molino Parish Church',
  'History and Culture',
  'Churches, Temples, and Places of Worship',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'Molino V',
  '42 Avenida Rizal, Bacoor, Cavite',
  'https://www.google.com/maps/place/Sto.+Ni%C3%B1o+de+Molino+Parish+Church/@14.3972686,120.969874,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3cee2f9e1fd:0xe6f6af5ca4010af8!8m2!3d14.3972634!4d120.9724489!16s%2Fg%2F1tcwnp1f?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3972634,
  120.9724489,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Bacoor City',
  29,
  'Bakood Festival',
  'Special Events',
  'Special Events',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Bacoor',
  'City of Bacoor',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  1,
  'Carmona Race Track, Inc.',
  'Sports and Recreation Facilities',
  '414 Other Sports and Recreational Activities',
  'Leasure and Entertainment Tourism',
  1991,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Bancal',
  'Governor''s Dr, Carmona, 4116 Cavite',
  'https://www.google.com/maps/place/Carmona+Racing+Track/@14.2817662,121.0063197,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d618c80092f9:0x8980dc787f13fd5f!8m2!3d14.281761!4d121.0088946!16s%2Fm%2F05z_ly9?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.281761,
  121.0088946,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  2,
  'Manila Southwoods Golf and Country Club',
  'Sports and Recreation Facilities',
  '401 Golf',
  'Leasure and Entertainment Tourism',
  1992,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Cabilang Baybay',
  'Congressional Rd, Carmona, Cavite',
  'https://www.google.com/maps/place/Manila+Southwoods+Golf+and+Country+Club/@14.3219218,121.0421129,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d70f9915187b:0xaf48efb4135c493d!8m2!3d14.3219166!4d121.0446878!16s%2Fg%2F1trxgtq5?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3219166,
  121.0446878,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  3,
  'Southwoods Sports and Country Club',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  1992,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Cabilang Baybay',
  'Manila Southwoods Golf and Country Club Gate, Congressional Rd, Carmona, 4116 Cavite',
  'https://www.google.com/maps/place/Southwoods+Sports+and+Country+Club/@14.3211127,121.0390343,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d753249ef579:0x1270df0ff777fed4!8m2!3d14.3211075!4d121.0416092!16s%2Fg%2F11rh0gs23r?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3211075,
  121.0416092,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  4,
  'Sorteo Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  2004,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'N/A',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  5,
  'The Original Aling Nene''s Special Binalot',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Cultural Tourism',
  1989,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Maduya',
  'Cavite Loyola St., Brgy, Maduya, Carmona, 4116 Cavite',
  'https://www.google.com/maps/place/Aling+Nene''s+Special+Binalot+-+Main+Branch/@14.3211586,121.0210096,14z/data=!4m10!1m2!2m1!1sThe+Original+Aling+Nene''s+Special+Binalot!3m6!1s0x3397d70ada3a0655:0x8721558f43dc2305!8m2!3d14.3146521!4d121.0597591!15sCilUaGUgT3JpZ2luYWwgQWxpbmcgTmVuZSdzIFNwZWNpYWwgQmluYWxvdForIil0aGUgb3JpZ2luYWwgYWxpbmcgbmVuZSdzIHNwZWNpYWwgYmluYWxvdJIBCnJlc3RhdXJhbnSaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjFrUTFKVWJGRlZNVTVoWTIxT1NsTXpVa3BVUmxaclZVUk9hV05JWXhBQuABAPoBBAgAECA!16s%2Fg%2F12qgqv3l8?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3146521,
  121.0597591,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  6,
  'San Lazaro Leisure Park',
  'Special Events',
  '702 Convention',
  'MICE and Events Tourism',
  1867,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Lantic',
  'Brgy, Carmona, Cavite',
  'https://www.google.com/maps/place/San+Lazaro+Leisure+Park/@14.2969367,121.032165,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d7b4432d471d:0x6d33df1c93d3cc78!8m2!3d14.2969315!4d121.0347399!16s%2Fg%2F11bw5sxmzx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2969315,
  121.0347399,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Carmona City',
  7,
  'Cleo by the Blue Leaf',
  'Special Events',
  '702 Convention',
  'MICE and Events Tourism',
  2023,
  'CALABARZON',
  'Cavite',
  'Carmona',
  'Cabilang Baybay',
  'Southwoods Sports and Country Club, Gate 5 Congressional Rd, Carmona, 4116 Cavite',
  'https://www.google.com/maps/place/Cleo+by+The+Blue+Leaf/@14.3208047,121.0386997,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d73f57051545:0x9b49e8f4ca766d9c!8m2!3d14.3207995!4d121.0412746!16s%2Fg%2F11vhgh_4vw?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3207995,
  121.0412746,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  1,
  'FORT SAN FELIPE',
  'History and Culture',
  '201 Fort',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 62 M',
  'Fort San Felipe',
  'https://www.google.com/maps/place/Fort+San+Felipe/@14.482166,120.9160542,19.25z/data=!4m15!1m8!3m7!1s0x3397cd3db7413887:0x8f300fed4cf95d29!2sFort+San+Felipe,+Cavite!3b1!8m2!3d14.4823746!4d120.9165408!16s%2Fm%2F0t5349n!3m5!1s0x3397cd3da5551485:0xa00148497cfb5330!8m2!3d14.482286!4d120.9166367!16s%2Fg%2F11f4qf7xpd?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4823746,
  120.9165408,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  2,
  'SAN ROQUE CHURCH',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  1725,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 58 A',
  'P. Burgos Ave, San Roque, Cavite',
  'https://www.google.com/maps/place/Diocesan+Shrine+of+Our+Lady+of+Solitude+of+Porta+Vaga+(San+Roque+Parish+Church)/@14.4800935,120.8985765,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd342c9767d1:0x36118e1d5bc35282!8m2!3d14.4800883!4d120.9011514!16s%2Fg%2F11bxfwr44z?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4800883,
  120.9011514,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  3,
  'JULIAN FELIPE MONUMENT',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 13 AGUILA',
  '1400 Manila-Cavite Rd, Santa Cruz, Cavite',
  'https://www.google.com/maps/place/Julian+R.+Felipe+Monument+and+Julian+Felipe+Historical+Marker/@14.4724637,120.8851359,17z/data=!3m1!4b1!4m6!3m5!1s0x339632b11bb09137:0x2357a19d44a05564!8m2!3d14.4724585!4d120.8877108!16s%2Fg%2F11ddwvr_0z?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4724585,
  120.8877108,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  4,
  'LADISLAO DIWA MONUMENT',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 35 HASA-HASA',
  'Caridad, Cavite',
  'https://www.google.com/maps/place/Ladislao+Diwa+Shrine+and+Ladislao+Diwa+Historical+Marker/@14.4781615,120.8898976,17z/data=!4m10!1m2!2m1!1sLADISLAO+DIWA+MONUMENT!3m6!1s0x339632ca7cab835d:0x1d00322b0ed7d228!8m2!3d14.4792826!4d120.8926152!15sChZMQURJU0xBTyBESVdBIE1PTlVNRU5UWhgiFmxhZGlzbGFvIGRpd2EgbW9udW1lbnSSARNoaXN0b3JpY2FsX2xhbmRtYXJrmgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVVI0YUMxeU1sTjNFQUXgAQD6AQUI9AEQPA!16s%2Fg%2F11c1xf5c_t?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4792826,
  120.8926152,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  5,
  '13 MARTYRS MONUMENT',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 61 M',
  'P. Burgos Ave, San Roque, Cavite',
  'https://www.google.com/maps/place/The+13+Martyrs+Monument+and+Thirteen+Martyrs+Park/@14.481429,120.9031278,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd98287a53ff:0x61e8e5a7bf0dd5f5!8m2!3d14.4814238!4d120.9057027!16s%2Fg%2F11rrphz8k_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4814238,
  120.9057027,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  6,
  'VILLA THERESA RESORT',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 28 TAURUS',
  'Camia, Santa Cruz, Cavite',
  'https://www.google.com/maps/place/Villa+Theresa+-+Cavite+City/@14.4725883,120.8920781,17z/data=!3m1!4b1!4m6!3m5!1s0x339632b35c0c23e9:0x850b313c1dd475e5!8m2!3d14.4725831!4d120.894653!16s%2Fg%2F11clsgdn87?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4725831,
  120.894653,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  7,
  'AMY''S RESORT',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  '49 J.Felipe Blvd, San Antonio, Cavite, 4100 Cavite',
  'https://www.google.com/maps/place/Amy''s+Resort/@14.4864,120.892159,17z/data=!3m1!4b1!4m6!3m5!1s0x339632cd269002c3:0x207b4ac3ad7db99b!8m2!3d14.4863948!4d120.8947339!16s%2Fg%2F11bwytf85m?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4863948,
  120.8947339,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  8,
  'BELL''S MINI RESORT',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  9,
  'SAMALA RICE  CAKES',
  'Shopping',
  '503 Souvenirs And Delicacies',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 39 JASMIN',
  'Padre Pio, Caridad, Cavite, 4100 Cavite',
  'https://www.google.com/maps/place/SAMALA+RICE+CAKE+STORE/@14.4788888,120.8928712,17z/data=!3m1!4b1!4m6!3m5!1s0x339632cab1f08735:0x4587bebe9265da02!8m2!3d14.4788836!4d120.8954461!16s%2Fg%2F1tgnp5bb?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4788836,
  120.8954461,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  10,
  'AURORA''S',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 31 MAYA-MAYA',
  '343 P. Burgos Ave, Caridad, Cavite',
  'https://www.google.com/maps/place/Andro+Aurora''s+Foodshop/@14.4686326,120.8614149,14z/data=!4m10!1m2!2m1!1sAURORA''S+cavite!3m6!1s0x339632b5c62100bf:0x938d5bd0fcec71fe!8m2!3d14.4769139!4d120.8912615!15sCg9BVVJPUkEnUyBjYXZpdGVaESIPYXVyb3JhJ3MgY2F2aXRlkgEKcmVzdGF1cmFudOABAA!16s%2Fg%2F11ryzp4htd?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4769139,
  120.8912615,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  11,
  'CHEFOO RESTAURANT',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 61 A',
  '945 P. Burgos Ave, San Roque, Cavite, 4100 Cavite',
  'https://www.google.com/maps/place/New+Chefoo+Restaurant/@14.480844,120.9009045,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd36c29b7dcb:0xd01d7b6c8043fdbc!8m2!3d14.4808388!4d120.9034794!16s%2Fg%2F1hc1wxd2v?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4808388,
  120.9034794,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  12,
  'ASAO GRILL',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 59 SITAW',
  '897 P. Burgos Ave, San Roque, Cavite, 4100 Cavite',
  'https://www.google.com/maps/place/Asao+Grill+and+Steak+House/@14.480619,120.9025576,3a,75y,300.18h,94.47t/data=!3m7!1e1!3m5!1s8eBCsefhmOtwu-ktvTihTA!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-4.465763490127799%26panoid%3D8eBCsefhmOtwu-ktvTihTA%26yaw%3D300.18375640607707!7i16384!8i8192!4m10!1m2!2m1!1sASAO+GRILL!3m6!1s0x339632b5cd94116d:0x66506340d0e17010!8m2!3d14.4806977!4d120.9024978!15sCgpBU0FPIEdSSUxMWgwiCmFzYW8gZ3JpbGySAQpyZXN0YXVyYW50mgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDJ0b2IyRnVTa1JTUnpFeFdUQjRSRkp0TVZGaFJXdDRWbXBHZVZsWFl4QULgAQD6AQQIABBC!16s%2Fg%2F1hc67gmzj?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4806977,
  120.9024978,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  13,
  'REGADA WATER FESTIVAL',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  14,
  'HERITAGE CULTURE AND ARTS',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  15,
  'PANGILINAN ANCESTRAL',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 58 M PATOLA',
  'Barangay 61 (Talong), San Roque, Cavite',
  'https://www.google.com/maps/place/Gervasio+Pangilinan+Historic+and+Heritage+House/@14.4806829,120.8998079,17.25z/data=!4m10!1m2!2m1!1sPANGILINAN+ANCESTRAL!3m6!1s0x3397cd000b7c3ec3:0xf359049267baf915!8m2!3d14.4806091!4d120.9034734!15sChRQQU5HSUxJTkFOIEFOQ0VTVFJBTJIBF2hpc3RvcmljYWxfcGxhY2VfbXVzZXVt4AEA!16s%2Fg%2F11vzxt6s6k?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4806091,
  120.9034734,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  16,
  'NAVIDAD CHRISTMAS FESTIVAL',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  17,
  'TEATRO BAILE DE CAVITE',
  'Customs and Traditions',
  '603 Performing Arts (e.g. Folk Music and Dance)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  18,
  'CORREGIDOR BEACH',
  'Sports and Recreation Facilities',
  '408 Beach for Sea Bathing',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 53 B YAKAL',
  'South Beach Resort Complex, Cavite',
  'https://www.google.com/maps/place/Corregidor+Beach+Resort+Complex/@14.3880001,120.5948859,17.75z/data=!4m7!3m6!1s0x33962117da9428e3:0x4bc6371f67fa03fd!4b1!8m2!3d14.3884239!4d120.5963599!16s%2Fg%2F11ddz0b6cb?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3884239,
  120.5963599,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  19,
  'CORREGIDOR CAMP',
  'History and Culture',
  '201 Fort',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 53 B YAKAL',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  20,
  'MONTANO HALL',
  'Sports and Recreation Facilities',
  '405 Sports Complex',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 41 ROSAL',
  'Cruz Herrera, Caridad, Cavite',
  'https://www.google.com/maps/place/Montano+Hall,+Cruz+Herrera,+Caridad,+Cavite/@14.4817335,120.8956721,18z/data=!4m10!1m2!2m1!1sMONTANO+HALL!3m6!1s0x3397cd34b09a3341:0x922dc2524ffa6f17!8m2!3d14.4823502!4d120.8966314!15sCgxNT05UQU5PIEhBTEySARFjb21wb3VuZF9idWlsZGluZ-ABAA!16s%2Fg%2F1tp_3ygx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4823502,
  120.8966314,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  21,
  'CAVITE CITY PUBLIC MARKET',
  'Shopping',
  '502 Open Air Market, Traditional Market Area',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 57',
  '494 Molina, San Roque, Cavite',
  'https://www.google.com/maps/place/Cavite+City+Public+Market/@14.4779074,120.8962987,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd35809a9ac3:0x2b14c0427ccd1a15!8m2!3d14.4779022!4d120.8988736!16s%2Fg%2F1wf1_c7s?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4779022,
  120.8988736,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  22,
  'CASA VIEJA',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 61 M  TALONG',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  23,
  'BALOY''S',
  'Shopping',
  '503 Souvenirs And Delicacies',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 12 LOVEBIRDS',
  '1056 Manila-Cavite Rd, Santa Cruz, Cavite',
  'https://www.google.com/maps/place/Baloy''s+Bakeshop/@14.4709123,120.8845753,17z/data=!3m1!4b1!4m6!3m5!1s0x339632b1bf93fe13:0x13e57a2660ebca0a!8m2!3d14.4709071!4d120.8871502!16s%2Fg%2F1hc2ng6g5?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4709071,
  120.8871502,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  24,
  'VILLA GENEROSA',
  'Sports and Recreation Facilities',
  '414 Other Sports and Recreational Activities',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 62 A KANGKONG',
  'CaÃ±acao bay, Judge Ibanez street, barangay 62-A Samonte Park Rotonda, Cavite',
  'https://www.google.com/maps/place/Villa+Generosa+Hotel+and+Resort/@14.4831969,120.9084435,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd3ba53b20c3:0x4e97eaafad97f4f5!8m2!3d14.4831917!4d120.9110184!16s%2Fg%2F11clsgb0yr?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4831917,
  120.9110184,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  25,
  'HATTDYS KITCHEN',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 39 JASMIN',
  '900 CPL E, L. Cajiga, Caridad, Cavite',
  'https://www.google.com/maps/place/HATTDY''S+SIZZLING+%26+PANCITERIA/@14.4799867,120.8966191,19z/data=!4m10!1m2!2m1!1sHATTDYS+KITCHEN!3m6!1s0x3397cd17dee459e3:0x47d8afa81668c65c!8m2!3d14.4799867!4d120.89781!15sCg9IQVRURFlTIEtJVENIRU5aESIPaGF0dGR5cyBraXRjaGVukgETZmlsaXBpbm9fcmVzdGF1cmFudOABAA!16s%2Fg%2F11r41172sf?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4799867,
  120.89781,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  26,
  'GOV. SAMONTE CIRCLE/SASH',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 62 A KANGKONG',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Cavite City',
  27,
  'ALING IKA''S CARINDERIA',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Cavite City',
  'BRGY 59 SITAW',
  'Unnamed Road, San Roque, Cavite',
  'https://www.google.com/maps/place/Aling+Ika+Carinderia/@14.4779176,120.8968262,17z/data=!3m1!4b1!4m6!3m5!1s0x3397cd2729236e29:0x1a6cf37fcad79c5c!8m2!3d14.4779124!4d120.8994011!16s%2Fg%2F11gyxh7lg1?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4779124,
  120.8994011,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  1,
  'Immaculate Conception Church',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Zone 1',
  'Don Placido Campos Avenue, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Immaculate+Conception+Parish+Church/@14.3269365,120.9168035,15z/data=!4m10!1m2!2m1!1sImmaculate+Conception+Church!3m6!1s0x3397d50202adf6a5:0xae7e3ac66f57f8f2!8m2!3d14.3269365!4d120.9358579!15sChxJbW1hY3VsYXRlIENvbmNlcHRpb24gQ2h1cmNoWh4iHGltbWFjdWxhdGUgY29uY2VwdGlvbiBjaHVyY2iSAQ9jYXRob2xpY19jaHVyY2iaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVUXpOMDFoV2paUlJSQULgAQD6AQQIABA0!16s%2Fm%2F0wynvn9?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3269365,
  120.9358579,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  2,
  'Museo De La Salle',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Fatima',
  'DBB-B, 4115 West Ave, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Museo+De+La+Salle/@14.3210168,120.9584772,17z/data=!4m16!1m9!3m8!1s0x3397d5b45a6c4e65:0xaa052ae8cd1fe5f6!2sMuseo+De+La+Salle!8m2!3d14.3210116!4d120.9610521!9m1!1b1!16s%2Fm%2F04drtbx!3m5!1s0x3397d5b45a6c4e65:0xaa052ae8cd1fe5f6!8m2!3d14.3210116!4d120.9610521!16s%2Fm%2F04drtbx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3210116,
  120.9610521,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  3,
  'Promenade Des DasmariÃ±as',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Burol',
  'Congressional Rd, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Promenade+De+Dasmari%C3%B1as/@14.3280729,120.9538146,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d52f5fcf5c81:0xd804cc1fbafbda0a!8m2!3d14.3280677!4d120.9563895!16s%2Fg%2F11fkhx285p?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3280677,
  120.9563895,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  4,
  'Blumen Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Paliparan',
  'Groundfloor Paterno, Caridad, Cavite City, 4100 Cavite',
  'https://www.google.com/maps/place/Blumen+Resort/@14.2851134,120.9913335,18.5z/data=!4m6!3m5!1s0x3397d676000eef49:0xbc53dbe7f0ac440d!8m2!3d14.2854476!4d120.9920011!16s%2Fg%2F1vnrhklw?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2854476,
  120.9920011,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  5,
  'Cocovalley Richnez Waterpark',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Paliparan III',
  '315 Molino - Paliparan Rd, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Coco+Valley+Richnez+Waterpark/@14.3166048,120.9828082,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5d5c83d1aa9:0x46748c54fc7f2d3e!8m2!3d14.3165996!4d120.9853831!16s%2Fg%2F11b_2pwsq_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3165996,
  120.9853831,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  6,
  'Jardin De DasmariÃ±as Resort & Restaurant',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sabang',
  '83 Don Placido Campos Avenue, Brgy Sabang, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Jardin+de+Dasmarinas+Resort/@14.3447796,120.9226883,17z/data=!4m9!3m8!1s0x3397d4ec1cdfad93:0x7465b6fd61da9302!5m2!4m1!1i2!8m2!3d14.3447744!4d120.9252632!16s%2Fg%2F11bwqg17nj?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3447744,
  120.9252632,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  7,
  'Kalipayan Resort Inc.',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Salitran 1',
  'Unit 2, Km 29, 2 Emilio Aguinaldo Hwy, Salitran II, Salitran, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Kalipayan+Resort/@14.3419782,120.9352581,17z/data=!4m10!3m9!1s0x3397d4f69137eeef:0x5cc02fee86367de0!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.341973!4d120.937833!16s%2Fg%2F1v_vqf_n?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.341973,
  120.937833,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  8,
  'Levia Garden Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc 2',
  'greenfield heights subdivision bucal, Duhat Blk 21 lot 4 5 6 duhat street, 2 Sampaloc, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/LEVIA+Garden+Resort/@14.2872768,120.9650626,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d58ac1ca5337:0x1af432d1777d4c0d!8m2!3d14.2872716!4d120.9676375!16s%2Fg%2F11g0hst35w?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2872716,
  120.9676375,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  9,
  'Medz Resort And Restaurant',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Paliparan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  10,
  'Merci Deiu Venue And Event Place',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  '7XQH+6CF, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Merci+Dieu+Events+Place+and+Venue+Rental/@14.2876505,120.9776988,19z/data=!4m6!3m5!1s0x3397d597b29f8ddb:0x7d9ae2fbac4b0366!8m2!3d14.2880613!4d120.9785578!16s%2Fg%2F11j2zhr9bx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2880613,
  120.9785578,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  11,
  'Qubo Qabana Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan 1',
  'Governor''s Drive',
  'https://www.google.com/maps/place/Qubo+Qabana+Resort+%26+Hotel/@14.2978958,120.9476833,18.75z/data=!4m10!3m9!1s0x3397d59b9e6e758d:0xebcf85ad09471f9a!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.297717!4d120.9484176!16s%2Fg%2F1tdr0vbm?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.297717,
  120.9484176,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  12,
  'Riverbank Fun Park And Garden Resort Inc.',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'San Agustin 2',
  '130 Don Placido Campos Avenue, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Riverbank+Fun+Park+%26+Garden+Resort/@14.3167193,120.9409217,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5a7e26def8b:0x3f219fd2bcdc8f1f!8m2!3d14.3167141!4d120.9434966!16s%2Fg%2F11bwynffbv?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3167141,
  120.9434966,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  13,
  'Riverside Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Salitran',
  'New Dasma Color Trade, Emilio Aguinaldo Hwy, Salitran, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Riverside+Resort/@14.3504189,120.7903446,12z/data=!4m17!1m5!2m4!1sRiverside+Resort!5m2!5m1!1s2026-08-29!3m10!1s0x3397d4f7243bffff:0x3600fdc89a7ccb01!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3504189!4d120.9427799!15sChBSaXZlcnNpZGUgUmVzb3J0kgEMcmVzb3J0X2hvdGVs4AEA!16s%2Fg%2F1hc6ly4hb?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3504189,
  120.9427799,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  14,
  'Saniya Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Salawag',
  'NIA ROAD Jose Abad Santos Ave, Salawag, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Saniya+Resort+and+Hotel+(Themed+Resort)/@14.3477708,120.9757306,19.75z/data=!4m10!3m9!1s0x3397d410a9c6a6bf:0x741937ab711d5500!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3481082!4d120.9760916!16s%2Fg%2F11b6x9dt8f?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3481082,
  120.9760916,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  15,
  'Stevenson''s Hideaway Hotel & Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan 1',
  'Smart-Tech Compound, Purok 4 Brgy, Langkaan I, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Stevensons+Hideaway+Resort+%26+Hotel/@14.279562,120.9446576,17.75z/data=!4m6!3m5!1s0x33bd7e2c6de71459:0xd4bf3c2c5f554f37!8m2!3d14.2790549!4d120.9457816!16s%2Fg%2F11g8v1rc6k?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2790549,
  120.9457816,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  16,
  'Swiss Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'San Agustin 2',
  'San agustin 2, swiss resort st, Emilio Aguinaldo Hwy, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Swiss+Resort/@14.3201395,120.9395509,17z/data=!4m10!3m9!1s0x3397d5a9d86aea71:0x113112e30e66bd64!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3201343!4d120.9421258!16s%2Fg%2F1tdyhr7g?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3201343,
  120.9421258,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  17,
  'Tubigan Garden Resort Incorporated',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Paliparan III',
  '343 Molino - Paliparan Rd, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Tubigan+Garden+Resort/@14.3188817,120.9815924,17z/data=!4m10!3m9!1s0x3397d5d51c542099:0xaf0b951690c62ac2!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3188765!4d120.9841673!16s%2Fg%2F11cm10r1yc?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3188765,
  120.9841673,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  18,
  'Volet''s Hotel & Resort, Inc.',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Burol Main',
  'Emilio Aguinaldo Hwy, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Volet''s+Resort+Hotel+%26+Restaurant/@14.325889,120.9377937,17z/data=!4m10!3m9!1s0x3397d5004e312ad9:0x1ed503c2618e55be!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3258838!4d120.9403686!16s%2Fg%2F1tdz6ym4?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3258838,
  120.9403686,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  19,
  'Villa Kaily Resort Hotel',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sabang',
  'Carungcong Compound, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Villa+Kaily+Resort+Hotel/@14.3487786,120.9218847,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d59b0f0aadab:0x899e2792aba0915c!8m2!3d14.3487734!4d120.9244596!16s%2Fg%2F11vd7prv37?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3487734,
  120.9244596,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  20,
  'Cocolada Mini Events',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Paliparan III',
  '391 Paliparan Rd, Paliparan - 3, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/COCOLADA/@14.3198652,120.9823557,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d565caed0d69:0xf2a7c5bff0b42f5!8m2!3d14.31986!4d120.9849306!16s%2Fg%2F11nnth5p52?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.31986,
  120.9849306,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  21,
  'JDLuxe Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'Sampaloc III, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/JDLuxe+Private+Resort/@14.2813561,120.9765691,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d56e8703c3a5:0xfef6d9acf46732a2!8m2!3d14.2813509!4d120.979144!16s%2Fg%2F11vbs5wv76?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2813509,
  120.979144,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  22,
  'Sto. NiÃ±o Eco Farm Resort Co.',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Burol Main',
  'Col. Estanislao M. Carungcong Road, Burol Main, Sto. NiÃ±o, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Sto.+Ni%C3%B1o+Ecofarm+Resort/@14.3366426,120.9400411,17z/data=!4m10!3m9!1s0x3397d457fb3be043:0x69b6d331a6e447d7!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3366374!4d120.942616!16s%2Fg%2F1hc4vmd96?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3366374,
  120.942616,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  23,
  'Laurio''s Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'Blk 12 Lot 7, Airmen''s Village, Sampaloc 3, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Laurio''s+Private+Resort/@14.2867083,120.9775856,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5e98645f909:0xeba6c42009b2a861!8m2!3d14.2867031!4d120.9801605!16s%2Fg%2F11nnvs3r2h?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2867031,
  120.9801605,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  24,
  'Amayabelle Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan 1',
  'Purok 3, 331 Malakas Street, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Amayabelle+Resort+And+EventsPlace/@14.2876657,120.9366243,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5001a00df9b:0xb12d0a352355440f!8m2!3d14.2876605!4d120.9391992!16s%2Fg%2F11y48wzr1t?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2876605,
  120.9391992,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  25,
  'Balai Ibayo Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan II',
  'Langkaan, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Balai+Ibayo+Resort/@14.2746179,120.9436379,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7f9e441545bf:0x6903165c4d00e813!8m2!3d14.2746127!4d120.9462128!16s%2Fg%2F11k209bqdp?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2746127,
  120.9462128,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  26,
  'JMX Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan II',
  'Blk 34 Lot 18, Greenbreeze, 1 Bellflower, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/JMX+PLACE/@14.3024507,120.9342091,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d542f568bef7:0xd490ec1ee11bead9!8m2!3d14.3024455!4d120.936784!16s%2Fg%2F11tg8_2gwv?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3024455,
  120.936784,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  27,
  'Piscina Privata Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc IV',
  'St Charbel Ave, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Piscina+Privada+Resort/@14.3046055,120.967179,17z/data=!4m10!1m2!2m1!1sPiscina+Privata+Resort!3m6!1s0x3397d5001c477759:0x62822cf5928f4668!8m2!3d14.3046055!4d120.9719426!15sChZQaXNjaW5hIFByaXZhdGEgUmVzb3J0WhgiFnBpc2NpbmEgcHJpdmF0YSByZXNvcnSSAQ1zd2ltbWluZ19wb29smgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDIxa2JGSldSalZhVms1d1YwVXhSR051UVRKWU1FcEdURlUxZFZwSFl4QULgAQD6AQQIABBK!16s%2Fg%2F11vwrf3869?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3046055,
  120.9719426,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  28,
  'Casa-De Teresita Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'CityView Subdivision, Block 6 Lot 1, Wyoming street, Brgy. Peial, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/The+Casa+de+Teresita+Private+Resort/@14.2802116,120.9820394,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5b08502eef1:0x9788b6ecea23e425!8m2!3d14.2802064!4d120.9846143!16s%2Fg%2F11thjqvxnk?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2802064,
  120.9846143,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  29,
  'JDQ Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan II',
  'Blk 40 Lot 16, Yellowbell Street, Green Breeze Ave, Langkaan, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/JDQ+Private+Resort/@14.303638,120.9310258,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d56ddba21951:0xaa775f2f72459176!8m2!3d14.3036328!4d120.9336007!16s%2Fg%2F11ssb5_stw?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3036328,
  120.9336007,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  30,
  'Casasignora Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'SBM. Eliserio G. Tagle, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Casa+Signora/@14.3037228,120.8924009,13z/data=!4m10!1m2!2m1!1sCasasignora+Resort!3m6!1s0x3397d5c5897658d9:0x7305c4cfadc91193!8m2!3d14.2867227!4d120.9770051!15sChJDYXNhc2lnbm9yYSBSZXNvcnRaFCISY2FzYXNpZ25vcmEgcmVzb3J0kgELZXZlbnRfdmVudWWaASNDaFpEU1VoTk1HOW5TMFZKUTBGblRVUkpiVzlEUzA1M0VBReABAPoBBAg9EBo!16s%2Fg%2F11r34ztpxl?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2867227,
  120.9770051,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  31,
  'Blue Stone Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan 1',
  'Langkaan Road',
  'https://www.google.com/maps/place/Blue+stone+Private+Pool/@14.2857775,120.9431546,19.5z/data=!4m6!3m5!1s0x3397d58072307345:0x8f060ddc68ca417!8m2!3d14.2857511!4d120.9434793!16s%2Fg%2F11cmssk_4f?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2857511,
  120.9434793,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  32,
  'John Cezar Waterfun Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Langkaan II',
  'Phase 3, Rotonda, Valle Verde Brgy, Langkaan 2, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/John+Cezar+Waterfun+Resort+and+Event+Hall/@14.3184358,120.9272003,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d578c5cbe87f:0xdab606411d10f52c!8m2!3d14.3184306!4d120.9297752!16s%2Fg%2F11q49gnq3s?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3184306,
  120.9297752,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  33,
  'EML Management Corporation',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  34,
  'Palmas Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Zone IV',
  'Diato Compound, Marilag Subdivision, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/Palmas+Del+Sol+Resort/@14.330159,120.9391171,17z/data=!4m10!3m9!1s0x3397d4ff62caed03:0xb3afaf41d65bd1ff!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3301538!4d120.941692!16s%2Fg%2F11r8q_f1f?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3301538,
  120.941692,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  35,
  'Green and Saddle Farm Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Zone III',
  'Amuntay Rd, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/The+Farm+Green+and+Saddle+Resort/@14.312614,120.9375242,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d509c207d927:0xc61958b27d3fcbab!8m2!3d14.3126088!4d120.9400991!16s%2Fg%2F11clsyjtl9?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3126088,
  120.9400991,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  36,
  'Casa Annilo Rental',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'San Jose',
  'Blk 2, Lot 1, Lagmay Compound, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Casa+Annilo/@14.3337011,120.9328377,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d50020d6cb59:0xcd12e3ad91965953!8m2!3d14.3336959!4d120.9354126!16s%2Fg%2F11x79cslpn?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3336959,
  120.9354126,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  37,
  'Riverleaf Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'Blk 6 Lot 10, Georgia St. Cityland Piela, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/The+Riverleaf+Resort+and+Events+Place/@14.280006,120.9717291,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7f003950f025:0xda3ac11fde8dba9a!8m2!3d14.2800008!4d120.974304!16s%2Fg%2F11wnyyrcj8?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2800008,
  120.974304,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  38,
  'CBH Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Sampaloc III',
  'Block 15 Lot 16 Piela Bridge, DasmariÃ±as, 4114 Cavite',
  'https://www.google.com/maps/place/CBH+Private+Resort/@14.2904484,120.9774112,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5cdc15b79ed:0xe9b4efe76ca70217!8m2!3d14.2904432!4d120.9799861!16s%2Fg%2F11n0lp5wt6?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2904432,
  120.9799861,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  39,
  'Vel Garden Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'Zone III',
  'Sitio Amuntay Rd, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/Vel+Garden+Resort/@14.3112352,120.9362469,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d50bc6639b37:0x57a37662a147f1d2!8m2!3d14.31123!4d120.9388218!16s%2Fg%2F11f54zhbj5?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.31123,
  120.9388218,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'DasmariÃ±as City',
  40,
  'OJ Villa Private Resort',
  'Sports and Recreation Facilities',
  '413 Resort Complex',
  'Leasure and Entertainment Tourism',
  2025,
  'CALABARZON',
  'Cavite',
  'City of DasmariÃ±as',
  'San Jose',
  'blk 5 lot 5, Lagmay compound, DasmariÃ±as, Cavite',
  'https://www.google.com/maps/place/OJ+Villa+Private+Resort/@14.3337011,120.9328377,17z/',
  14.3337011,
  120.9328377,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Mariano Alvarez',
  1,
  'Kabutenyo Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  2005,
  'CALABARZON',
  'Cavite',
  'General Mariano Alvarez',
  'Poblacion 1',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  1,
  'Canaria Resort',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Navarro',
  'Navarro Rd, General Trias, Cavite',
  'https://www.google.com/maps/place/Canaria+Resort+Cavite/@14.3852803,120.9032643,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d34ff58eed63:0x7b9381f17c4cbc84!8m2!3d14.3852751!4d120.9058392!16s%2Fg%2F11c60hj4df?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3852751,
  120.9058392,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  2,
  'Eagle Ridge Golf and Country Club',
  'Sports and Recreation Facilities',
  '401 Golf',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Poblacion',
  '7W65+338, North Blvd, General Trias, Cavite',
  'https://www.google.com/maps/place/Eagle+Ridge+Golf+and+Country+Club+(Aoki+Clubhouse)/@14.2519161,120.9049464,17z/data=!4m10!1m2!2m1!1sEagle+Ridge+Golf+and+Country+Club!3m6!1s0x33bd7f84bc4824b5:0x53a722e025a5e8d2!8m2!3d14.2519904!4d120.9068811!15sCiFFYWdsZSBSaWRnZSBHb2xmIGFuZCBDb3VudHJ5IENsdWJaIyIhZWFnbGUgcmlkZ2UgZ29sZiBhbmQgY291bnRyeSBjbHVikgELZ29sZl9jb3Vyc2XgAQA!16s%2Fg%2F1q64xx03b?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2519904,
  120.9068811,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  3,
  'Eden''s Pastillas Pasalubong Center',
  'Special Events',
  '503 Souvenirs And Delicacies',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Pasong Kawayan II',
  'General Trias, 4107 Cavite',
  'https://www.google.com/maps/place/Eden''s+Pastillas/@14.335673,120.7295035,12z/data=!4m10!1m2!2m1!1sEden''s+Pastillas+Pasalubong+Center!3m6!1s0x33962b6d42082839:0xa155e544dbd3f4a2!8m2!3d14.335802!4d120.8819737!15sCiJFZGVuJ3MgUGFzdGlsbGFzIFBhc2FsdWJvbmcgQ2VudGVykgERZm9vZF9tYW51ZmFjdHVyZXLgAQA!16s%2Fg%2F11j3wx8hrl?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.335802,
  120.8819737,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  4,
  'Felize Cafe',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Pasong Kawayan II',
  'Prinza St.',
  'https://www.google.com/maps/place/Felize+Cafe/@14.3408828,120.866921,15z/data=!4m10!1m2!2m1!1sFelize+Cafe!3m6!1s0x33962bebe891e94b:0xcff5cef6f83df516!8m2!3d14.3360922!4d120.8819798!15sCgtGZWxpemUgQ2FmZVoNIgtmZWxpemUgY2FmZZIBCnJlc3RhdXJhbnTgAQA!16s%2Fg%2F11q9zr8h0m?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3360922,
  120.8819798,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  5,
  'GBR Museum',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Javalera',
  NULL,
  'https://www.google.com/maps/place/Geronimo+Berenguer+De+Los+Reyes+Museum/@14.2646027,120.9163806,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7fbe2720c6c9:0x7ed972559e71f62f!8m2!3d14.2645975!4d120.9189555!16s%2Fg%2F1tfkhpyt?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2645975,
  120.9189555,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  6,
  'General Trias City Park',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'San Juan I',
  'General Trias Bypass Road',
  'https://www.google.com/maps/place/General+Trias+City+Park/@14.3865438,120.8733293,18.88z/data=!4m10!1m2!2m1!1sgeneral+trias+park!3m6!1s0x33962dd429777a27:0x1ad37c77f7a35b6b!8m2!3d14.3867732!4d120.8751148!15sChJnZW5lcmFsIHRyaWFzIHBhcmuSAQRwYXJr4AEA!16s%2Fg%2F11qsmpbhdc?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3867732,
  120.8751148,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  7,
  'General Trias Plaza Rizal',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Brgy. Bagumbayan',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  8,
  'General Trias Cultural and Convention Center',
  'History and Culture',
  '206 Structures and Buildings',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Brgy. Sampalucan',
  'Arnaldo Pob. (Bgy. 7), General Trias, Cavite',
  'https://www.google.com/maps/place/General+Trias+Convention+%2F+Cultural+Center/@14.3880911,120.8743984,17z/data=!3m1!4b1!4m6!3m5!1s0x33962cbccbd2437d:0x48240a5fb704103!8m2!3d14.3880859!4d120.8769733!16s%2Fg%2F11cjnnllxz?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3880859,
  120.8769733,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  9,
  'General Trias Dairy',
  'Shopping',
  '503 Souvenirs And Delicacies',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Santiago',
  'Arnaldo Hwy, General Trias, Cavite',
  'https://www.google.com/maps/place/GenTri+Dairy+Shop+(Dairy+Box)/@14.3482806,120.9037626,20.5z/data=!4m10!1m2!2m1!1sGeneral+Trias+Dairy+!3m6!1s0x3397d4c92e4f7c71:0x3d5a9a7628ff4ad0!8m2!3d14.348243!4d120.9039177!15sChNHZW5lcmFsIFRyaWFzIERhaXJ5kgELZGFpcnlfc3RvcmXgAQA!16s%2Fg%2F1tgz2_sr?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.348243,
  120.9039177,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  10,
  'General Trias Sports Complex',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'San Juan I',
  'Drive, General Trias, 4107 Cavite',
  'https://www.google.com/maps/place/9VMG%2B3HQ+General+Trias+Sports+Complex,+Drive,+General+Trias,+4107+Cavite/@14.3828195,120.8739799,17z/data=!3m1!4b1!4m6!3m5!1s0x33962ca3d9a9c1a3:0xd0afab7b21cc9a4c!8m2!3d14.3827691!4d120.8765394!16s%2Fg%2F11bvtd_jxm?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3827691,
  120.8765394,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  11,
  'General Trias Sports Park',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Santiago',
  '687 Arnaldo Hwy, General Trias, Cavite',
  'https://www.google.com/maps/place/General+Trias+Sports+Park/@14.3345064,120.9075355,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d5dd9b4dfefb:0xc092d2a921ca0db!8m2!3d14.3345012!4d120.9101104!16s%2Fg%2F11lr62mjm2?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3345012,
  120.9101104,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  12,
  'Hidden Vega Resort',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Manggahan',
  'Lot 28 Block 6, Stateland View Subdivision, Manggahan, General Trias, 4107 Cavite',
  'https://www.google.com/maps/place/Hidden+Vega+Resort/@14.3043399,120.9059887,17z/data=!4m10!3m9!1s0x3397d545bf80b845:0xb98bed481b6c0f07!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.3043399!4d120.9085583!16s%2Fg%2F1tdkp9yc?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3043399,
  120.9085583,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  13,
  'Jams Cafe',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Manggahan / Poblacion',
  'Divimart Supermarket - Manggahan, General Trias City, Cavite, Governor''s Dr, General Trias, 4107 Cavite',
  'https://www.google.com/maps/place/JamsCafe+Skymart/@14.293242,120.9093483,17.75z/data=!4m13!1m5!2m4!1sJams+Cafe!5m2!5m1!1s2026-08-29!3m6!1s0x3397d57fc8054945:0x54e256ca6c2f2c39!8m2!3d14.2935661!4d120.9100472!15sCglKYW1zIENhZmVaCyIJamFtcyBjYWZlkgEKcmVzdGF1cmFudOABAA!16s%2Fg%2F11mwg5j20h?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2935661,
  120.9100472,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  14,
  'Lawiswis Kawayan',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Pasong Kawayan II',
  'Pasong Kawayan II, General Trias, Cavite',
  'https://www.google.com/maps/place/Lawiswis+Kawayan+By+Japong''s+Sizzling+Hub/@14.3326082,120.8672151,14.25z/data=!4m10!1m2!2m1!1sLawiswis+Kawayan!3m6!1s0x33962b00426bf1a7:0x5698658d328e01bf!8m2!3d14.3360211!4d120.8822641!15sChBMYXdpc3dpcyBLYXdheWFuWhIiEGxhd2lzd2lzIGthd2F5YW6SAQpyZXN0YXVyYW504AEA!16s%2Fg%2F11y2r6gkhn?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3360211,
  120.8822641,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  15,
  'Mang Mike''s Valenciana',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Pinagtipunan / Poblacion / Tejero / Pasong Camachile II',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  16,
  'Maple Grove by Megaworld',
  NULL,
  NULL,
  NULL,
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Tejero',
  'Antero Soriano Hwy, General Trias, Cavite',
  'https://www.google.com/maps/place/Maple+Grove/@14.3989291,120.8681065,17z/data=!3m1!4b1!4m6!3m5!1s0x33962cbf3f131ce5:0x5e9a9eb613487e98!8m2!3d14.3989291!4d120.8706761!16s%2Fg%2F11h9wnvl44?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3989291,
  120.8706761,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  17,
  'Mikay''s Restaurant',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Sta. Clara',
  'Governor''s Drive',
  'https://www.google.com/maps/place/Mikay''s+Restaurant+General+Trias/@14.3398479,120.6959483,11z/data=!4m10!1m2!2m1!1sMikay''s+Restaurant!3m6!1s0x33962d38741ba9ff:0x9cb4988cdee9bdff!8m2!3d14.3770757!4d120.884032!15sChJNaWtheSdzIFJlc3RhdXJhbnRaFCISbWlrYXkncyByZXN0YXVyYW50kgERZmFtaWx5X3Jlc3RhdXJhbnTgAQA!16s%2Fg%2F11r_7xt72m?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3770757,
  120.884032,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  18,
  'Our Lady of Guadalupe Parish',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Biclatanb',
  'Crisanto M Delos Reyes, Crisanto M. De Los Reyes Ave, Heneral Trias, Cavite',
  'https://www.google.com/maps/place/Our+Lady+of+Guadalupe+Church,+Crisanto+M+Delos+Reyes,+Crisanto+M.+De+Los+Reyes+Ave,+Heneral+Trias,+Cavite/@14.2607841,120.9126255,17.25z/data=!4m6!3m5!1s0x33bd7f971edc99c3:0x85170d4273e0791!8m2!3d14.2605357!4d120.9147473!16s%2Fg%2F11bvtjk_t_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2605357,
  120.9147473,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  19,
  'Serville Ana''s Resort',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Navarro',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  20,
  'Soak ''N Swim Resort',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'San Francisco',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  21,
  'St. Francis of Assisi Parish',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Poblacion',
  'Prinza St, Barangay Sampalucan, General Trias, 4107 Cavite',
  'https://www.google.com/maps/place/San+Francisco+De+Malabon+Parish+Church/@14.3483636,120.4008875,9z/data=!4m10!1m2!2m1!1sSt.+Francis+of+Assisi+Parish!3m6!1s0x33962ca4edf2024f:0xbe704374b0fa219f!8m2!3d14.3854985!4d120.8800089!15sChxTdC4gRnJhbmNpcyBvZiBBc3Npc2kgUGFyaXNoWh0iG3N0IGZyYW5jaXMgb2YgYXNzaXNpIHBhcmlzaJIBD2NhdGhvbGljX2NodXJjaJoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQycEdibGxZU2xCaVNGbzJUVEZDZWxFelNrZFpNMDVQWVVSS01tTkdSUkFC4AEA-gEECAAQSg!16s%2Fm%2F0w30h7k?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3854985,
  120.8800089,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  22,
  'Valenciana Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Poblacion',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  23,
  'Grand Pasayo: Battle of Champions',
  'Special Events',
  '799 Other Events',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Poblacion',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'General Trias City',
  24,
  'General Trias People''s Park',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'General Trias City',
  'Biclatan',
  NULL,
  'https://www.google.com/maps/place/City+of+General+Trias+People''s+Park/@14.2726606,120.9182564,17z/data=!4m10!1m2!2m1!1sGeneral+Trias+People''s+Park!3m6!1s0x33bd7f007df9aef9:0x12d2245c41bd675!8m2!3d14.2726875!4d120.9210625!15sChtHZW5lcmFsIFRyaWFzIFBlb3BsZSdzIFBhcmuSAQ1wYXJrX2FuZF9yaWRl4AEA!16s%2Fg%2F11wfc6sxdx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.2726875,
  120.9210625,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  1,
  'Gen. Licerio Topacio Park',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  'Imus City Plaza',
  'https://www.google.com/maps/place/General+Licerio+Topacio+Monument/@14.4280575,120.9338788,17z/data=!4m10!1m2!2m1!1sGen.+Licerio+Topacio+Park!3m6!1s0x3397d3ffb2b2ea01:0x2a4cdf791517b215!8m2!3d14.4289126!4d120.9361988!15sChlHZW4uIExpY2VyaW8gVG9wYWNpbyBQYXJrWhoiGGdlbiBsaWNlcmlvIHRvcGFjaW8gcGFya5IBE2hpc3RvcmljYWxfbGFuZG1hcmuaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnc1YUZkVlVUUmpTRnBhWWpCdk1tUkZjM2hqYmxKM1RWZEdkRm96WXhBQuABAPoBBAgAEDk!16s%2Fg%2F11t61nyw_r?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4289126,
  120.9361988,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  2,
  'Juan Munti  Park',
  'Health and Wellness',
  '411 Parks',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Toclong 1-A',
  '144 Tahimik St, Imus, Cavite',
  'https://www.google.com/maps/place/Juan+Munti+Park/@14.4322031,120.9317661,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d300698a372d:0xd049b6a32feabe9b!8m2!3d14.4322031!4d120.9343464!16s%2Fg%2F11vzz4cx9b?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4322031,
  120.9343464,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  3,
  'Dambana ng Pambansang Watawat',
  'Customs and Traditions',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Alapan II-A',
  'Bucandala-Alapan Rd, Imus, Cavite',
  'https://www.google.com/maps/place/DAMBANA+NG+PAMBANSANG+WATAWAT+NG+PILIPINAS/@14.4035329,120.9127217,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3232f06d147:0xd1436d4580c6c7ff!8m2!3d14.4035329!4d120.915302!16s%2Fg%2F11b5yywl7q?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4035329,
  120.915302,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  4,
  'Isabel Bridge',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  'Imus Cavite',
  'https://www.google.com/maps/place/Bridge+of+Isabel+II+Historical+Marker/@14.4302618,120.9376579,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3ea942b2e13:0x8cd7bc7c3e2bae37!8m2!3d14.4302618!4d120.9402382!16s%2Fm%2F010qk2tx?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4302618,
  120.9402382,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  5,
  'City of Imus Grandstand and Track Oval',
  'Sports and Recreation Facilities',
  '703 Sports Event',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Malagasang 1-G',
  'Malagasang II-E, Imus, Cavite',
  'https://www.google.com/maps/place/Imus+Track+%26+Field+Oval+and+Grandstand/@14.3923555,120.9163699,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3681ead8d79:0x64beb328b8b2bf62!8m2!3d14.3923555!4d120.9189502!16s%2Fg%2F11fprbf_hq?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3923555,
  120.9189502,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  6,
  'City of Imus Sports Complex',
  'Sports and Recreation Facilities',
  '703 Sports Event',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  'General CastaÃ±eda St, Imus, 4103 Cavite',
  'https://www.google.com/maps/place/Imus+City+Sports+Complex/@14.3923519,120.877745,13z/data=!4m10!1m2!2m1!1sCity+of+Imus+Sports+Complex!3m6!1s0x3397d2f4a390129f:0x4a581d05ca1d5af5!8m2!3d14.4298102!4d120.9365287!15sChtDaXR5IG9mIEltdXMgU3BvcnRzIENvbXBsZXiSAQtldmVudF92ZW51ZeABAA!16s%2Fg%2F1tm1m_7_?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4298102,
  120.9365287,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  7,
  'Pupugayo Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Alapan II-A',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  8,
  'Imus Cathedral',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  'General CastaÃ±eda St, Imus, 4103 Cavite',
  'https://www.google.com/maps/place/Diocesan+Shrine+and+Cathedral+Parish+of+Our+Lady+of+the+Pillar+(Imus+Cathedral)/@14.4295655,120.9335258,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d2f49e2d502d:0xd32bcd932914f10f!8m2!3d14.4295655!4d120.9361007!16s%2Fm%2F0v3gzwb?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4295655,
  120.9361007,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  9,
  'Casa de Celo',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  '104 General E Topacio St, Imus, 4103 Cavite',
  'https://www.google.com/maps/place/Casa+De+Celo/@14.4277914,120.9350297,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d2f45dcc9245:0xc25366f0a689cf9d!8m2!3d14.4277914!4d120.9376046!16s%2Fg%2F1q67t63ht?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4277914,
  120.9376046,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  10,
  'Glorias Restaurant',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Bucandala II',
  'Block 5, Lot 11, Phase 2, Canada Street, Sarreal Village, Bucandala Rd, Imus, Cavite',
  'https://www.google.com/maps/place/Gloria%E2%80%99s+Event+Place+and+Restaurant/@14.4277878,120.8964048,13z/data=!4m10!1m2!2m1!1sGlorias+Restaurant!3m6!1s0x3397d31838b13c73:0xadf570674469d92d!8m2!3d14.4037739!4d120.927324!15sChJHbG9yaWFzIFJlc3RhdXJhbnRaFCISZ2xvcmlhcyByZXN0YXVyYW50kgETZmlsaXBpbm9fcmVzdGF1cmFudJoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQycENNRnBGYkRWTlJGWkZWVE5DZFZac1RsSlNNbXhQWlVkbmQxWklZeEFC4AEA-gEECAAQDw!16s%2Fg%2F11syv36pfl?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4037739,
  120.927324,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  11,
  'Bullshed Binalot',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  '1626 Sampaguita, Imus, Cavite',
  'https://www.google.com/maps/place/Bullshed:+Binalot+sa+Imus/@14.4085146,120.9326402,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3b1587f5779:0x8f1209ea9d7de47!8m2!3d14.4085146!4d120.9352151!16s%2Fg%2F11ss7gvtlc?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4085146,
  120.9352151,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  12,
  'Hybrid Project',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Poblacion',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  13,
  'VCJL Resort',
  'Others',
  '901 Others (Please specify)',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Alapan II-A',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  14,
  'South Leisure Resort and Hotel Inc',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Malagasang II-C',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  15,
  'Hiraya Private Pool',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Bayan Luma V',
  'Padua St, Imus, Cavite',
  'https://www.google.com/maps/place/Hiraya+Private+Pool+House+%26+Events+Place/@14.4132404,120.896884,13z/data=!4m13!1m5!2m4!1sHiraya+Private+Pool!5m2!5m1!1s2026-08-29!3m6!1s0x3397d300014c4e47:0xa4236a74b6e4f43c!8m2!3d14.4132404!4d120.9380827!15sChNIaXJheWEgUHJpdmF0ZSBQb29skgELZXZlbnRfdmVudWXgAQA!16s%2Fg%2F11wfp9sx67?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4132404,
  120.9380827,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  16,
  'Miguel Santo Private  Resort',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Alapan 1-C',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  17,
  'Pr1me Resort',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Bayan Luma 6',
  'Treelane3 Main Rd, Imus, Cavite',
  'https://www.google.com/maps/place/Pr1mus+-+A+Prime+Resort+in+Imus/@14.2383211,120.6257391,10z/data=!4m10!1m2!2m1!1sPr1me+Resort!3m6!1s0x3397d381f9371231:0x31529d7479ebd820!8m2!3d14.4085482!4d120.9343048!15sCgxQcjFtZSBSZXNvcnRaDiIMcHIxbWUgcmVzb3J0kgEFdmlsbGGaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUjRYelJVY21WQkVBReABAPoBBAg8ECs!16s%2Fg%2F11t1876y9c?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4085482,
  120.9343048,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  18,
  'Freyas Private Resort',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Medicion I-C',
  'Medicion I-C, Imus, Cavite',
  'https://www.google.com/maps/place/Freya''s+Private+Resort/@14.4358935,120.9287752,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3005a64ca23:0xcdc087f2cfa42245!8m2!3d14.4358883!4d120.9313501!16s%2Fg%2F11w3m71w4z?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4358883,
  120.9313501,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  19,
  'Mhonets Private Pool',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Bayan Luma II',
  'Treelane II Main Rd, Imus, Cavite',
  'https://www.google.com/maps/place/Mhonet%E2%80%99s+Private+Resort/@14.41829,120.9310692,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3003827344d:0x3608b4e2c4aacb16!8m2!3d14.4182848!4d120.9336441!16s%2Fg%2F11ldqjfckg?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4182848,
  120.9336441,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  20,
  'Jay Z Resort',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Medicion I',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  21,
  'Deyscape Private Resort',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus',
  'Toclong I-C',
  '129 General Satorre St, Imus, Cavite',
  'https://www.google.com/maps/place/DeyScape+Private+Resort/@14.4368641,120.9326757,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d35a219622cf:0x870a973bd83b2571!8m2!3d14.4368589!4d120.9352506!16s%2Fg%2F11nn1ttrmy?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4368589,
  120.9352506,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  22,
  'BLACK V HOMESTAY',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus City',
  'TOCLONG 2B',
  'Velarde Village, Block 2 Lot 3, Phase 2 Medicion 1C, Imus, 4103 Cavite',
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  23,
  'BACKYARD RESORT',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus City',
  'MEDICION 2-C',
  'Blk 2 Lot 5 Samalabanan Subd, Imus, 4103 Cavite',
  'https://www.google.com/maps/place/Backyard+Resort/@14.4455345,120.9194469,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3e7a5c12d5b:0x737e57094e9f3522!8m2!3d14.4455293!4d120.9220218!16s%2Fg%2F11rx3frxps?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4455293,
  120.9220218,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  24,
  'J AND Y EVENTS PLACE RENTAL',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus City',
  'ALAPAN 1-A',
  'lot 5 phase 9, acm woodstock, Blk 29, 1a Alapan St, Imus',
  'https://www.google.com/maps/place/J+and+Y+events+place/@14.4178095,120.9169188,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3cb8569ab29:0x6203a0ad4ec1c0c1!8m2!3d14.4178043!4d120.9194937!16s%2Fg%2F11kj41lqdt?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.4178043,
  120.9194937,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  25,
  'LAPENSAR PRIVATE RESORT',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus City',
  'PASONG BUAYA 1',
  'Pasong Buaya I, Imus, Cavite',
  'https://www.google.com/maps/place/La+Pensar+Private+Resort+and+Events+Place/@14.3678109,120.9584196,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d300009ceb27:0x3236c058a8b35f7d!8m2!3d14.3678057!4d120.9609945!16s%2Fg%2F11vq6mmlb1?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3678057,
  120.9609945,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Imus City',
  26,
  'K&L''S PRIVATE POOL AND EVENTS PLACE RENTAL',
  'Others',
  '901 Others (Please specify)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Imus City',
  'MALAGASANG',
  'Malagasang Rd, Imus, Cavite',
  'https://www.google.com/maps/place/K%26L''s+Private+Pool+and+Events+Place/@14.3952851,120.927572,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d31f74934c2b:0xded577aae560ff30!8m2!3d14.3952799!4d120.9301469!16s%2Fg%2F11kbr9l1q4?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  14.3952799,
  120.9301469,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  1,
  'Indang Community Museum',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Poblacion 1',
  'Plaridel St. Indang Cavite',
  'https://www.google.com/maps/place/Museo+De+Indang/@14.1954336,120.8781053,19.5z/data=!4m6!3m5!1s0x33bd821409b50783:0x1df5544a67b8e9de!8m2!3d14.1955208!4d120.878507!16s%2Fg%2F11dxdb18y4?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1955208,
  120.878507,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  2,
  'Bonifacio Shrine',
  'Customs and Traditions',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Limbon',
  'Brgy Pangil Rd, Indang, Cavite',
  'https://www.google.com/maps/place/Bonifacio+Shrine,+Brgy+Pangil+Rd,+Indang,+Cavite/@14.2002253,120.9014205,15.83z/data=!4m10!1m2!2m1!1sBonifacio+Shrine!3m6!1s0x33bd78af17129061:0xafd0aee6bde816ba!8m2!3d14.1998981!4d120.9032068!15sChBCb25pZmFjaW8gU2hyaW5lkgERY29tcG91bmRfYnVpbGRpbmfgAQA!16s%2Fg%2F1pzsgwvt9?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1998981,
  120.9032068,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  3,
  'CvSU Agri-Eco Tourism Park',
  'Industrial Tourism',
  '301 Agro-Forestry',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Bancod',
  'Hostel Tropicana, Indang, Cavite',
  'https://www.google.com/maps/place/LouFil+Orchard+Resort/@14.2278334,120.8805939,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd81e8ed443e4d:0x88201fcfa89da845!8m2!3d14.2278334!4d120.8831688!16s%2Fg%2F12hkf4ysx?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.2278334,
  120.8831688,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  4,
  'Loufil Resort',
  'Sports and Recreation Facilities',
  '409 Pools and Springs',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Mataas na Lupa',
  'Km. 51.5 Mataas na lupa, Indang, 4122 Cavite',
  'https://www.google.com/maps/place/LouFil+Orchard+Resort/@14.2278334,120.8805939,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd81e8ed443e4d:0x88201fcfa89da845!8m2!3d14.2278334!4d120.8831688!16s%2Fg%2F12hkf4ysx?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.2278334,
  120.8831688,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  5,
  'Marayata Farm',
  'Customs and Traditions',
  '601 Local Specialty Restaurant',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Kayquit II',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  6,
  'Pio de Roda',
  'Special Events',
  '799 Other Events',
  'MICE and Events Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Poblacion II',
  '508 De Ocampo St, Poblacion 3, Indang, 4122 Cavite',
  'https://www.google.com/maps/place/Pio+De+Roda+Cafe+Indang/@14.1966481,120.8736073,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd82142997c9e1:0x21a3e166074fa58d!8m2!3d14.1966481!4d120.8761822!16s%2Fg%2F11dxh_tz03?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1966481,
  120.8761822,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  7,
  'Precious Garden Events Place',
  'Special Events',
  '799 Other Events',
  'MICE and Events Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Buna Cerca',
  'Mendez - Buna - Indang Road',
  'https://www.google.com/maps/place/Precious+Garden+Events+Place/@14.1832657,120.8870567,18.96z/data=!4m10!3m9!1s0x33bd830037af7141:0xe06c79f9b9e0d9a5!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.1924204!4d120.8839266!16s%2Fg%2F11ln_ngwds?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1924204,
  120.8839266,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  8,
  'Sanctuario Nature Farms',
  'Industrial Tourism',
  '302 Farm / Ranch',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Kayquit III',
  'Sitio Italaro, Brgy. Kayquit, 3 Indang - Mendez Rd, Indang, 4122 Cavite',
  'https://www.google.com/maps/place/Sanctuario+Nature+Farms/@14.1499061,120.9011529,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7873b1259e17:0x8a0994b9daa1ac87!8m2!3d14.1499061!4d120.9037278!16s%2Fg%2F11b70kqxzk?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1499061,
  120.9037278,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Indang',
  9,
  'St. Gregory the Great Parish',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Indang',
  'Poblacion III',
  'Indang - Trece Martires Road',
  'https://www.google.com/maps/place/Saint+Gregory+the+Great+Parish/@14.1961487,120.8779579,18.5z/data=!4m10!1m2!2m1!1sSt.+Gregory+the+Great+Parish!3m6!1s0x33bd83007062e32f:0x4f7b20843b2080b7!8m2!3d14.1965964!4d120.8784341!15sChxTdC4gR3JlZ29yeSB0aGUgR3JlYXQgUGFyaXNoWh0iG3N0IGdyZWdvcnkgdGhlIGdyZWF0IHBhcmlzaJIBD2NhdGhvbGljX2NodXJjaJoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQydEtSV1ZHUWs5U2FURlJUVE5OTUdGVmJESlpWVkowV1ZSYWNWWldSUkFC4AEA-gEECAAQGQ!16s%2Fm%2F011sq9f1?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1965964,
  120.8784341,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  1,
  'Buhay Forest',
  'Nature',
  '101 Mountains/hills/highlands',
  'Nature Tourism',
  2012,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'San Agustin',
  'Magallanes, Cavite',
  'https://www.google.com/maps/place/Buhay+Forest/@14.1672821,120.7170282,17.96z/data=!4m6!3m5!1s0x33bd855dd4ff1ba3:0xdd47247eb76ce198!8m2!3d14.1680522!4d120.7179008!16s%2Fg%2F11f_sn0ryr?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1680522,
  120.7179008,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  2,
  'Utod River & Falls',
  'Nature',
  '102 Falls',
  'Nature Tourism',
  2009,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Tua',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  3,
  'Jump off to Mt. Marami',
  'Nature',
  '101 Mountains/hills/highlands',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Ramirez',
  'Magallanes - Maragondon Rd, Maragondon, Cavite',
  'https://www.google.com/maps/place/Mt.+Marami+Jump-off+Point+via+Brgy.+Talipusngo/@14.2134204,120.7523981,18z/data=!3m1!4b1!4m6!3m5!1s0x33bd85cb92b260e7:0x9f2b46659d33ed9b!8m2!3d14.2134204!4d120.7536856!16s%2Fg%2F11xgr1v33z?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.2134204,
  120.7536856,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  4,
  'Magalanes Eco Park',
  'Others',
  '411 Parks',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'San Agustin',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  5,
  'Pintong Gubat Viewdeck',
  'Nature',
  '101 Mountains/hills/highlands',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Urdaneta',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  6,
  'Magallanes Marker',
  'Nature',
  '411 Parks',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Kabulusan',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  7,
  'Enduro',
  'Nature',
  '414 Other Sports and Recreational Activities',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Kabulusan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  8,
  'Bike Trail',
  'Nature',
  '414 Other Sports and Recreational Activities',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Kabulusan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  9,
  'Taste Indulge Know Magallanes Entreprenuer For Products (Tikme)',
  'Shopping',
  '503 Souvenirs And Delicacies',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'San Agustin',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  10,
  'Muscovado Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Poblacion III',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  11,
  'Farmer''s Month',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Poblacion IV',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  12,
  'Nuestra SeÃ±ora de Guia Church',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Poblacion IV',
  'Nuestra Senora de Guia Parish, De Guia, Magallanes, Cavite',
  'https://www.google.com/maps/place/Nuestra+Se%C3%B1ora+de+Guia+Parish+-+Catholic/@14.1814438,120.7520967,15z/data=!4m10!1m2!2m1!1sNuestra+Se%C3%B1ora+de+Guia+Church!3m6!1s0x33bd85001306a0f3:0x91c8dceb9e36b9b3!8m2!3d14.1869727!4d120.7568384!15sCh5OdWVzdHJhIFNlw7FvcmEgZGUgR3VpYSBDaHVyY2haICIebnVlc3RyYSBzZcOxb3JhIGRlIGd1aWEgY2h1cmNokgEPY2F0aG9saWNfY2h1cmNomgEjQ2haRFNVaE5NRzluUzBWSlEwRm5UVU52TTB0bFpHSjNFQUXgAQD6AQQIABAb!16s%2Fg%2F11fy4ybrb2?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1869727,
  120.7568384,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  13,
  'Magallanes Public Market',
  'Shopping',
  '502 Open Air Market, Traditional Market Area',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'San Agustin',
  'Magallanes Public Market, Kaytitinga - Magallanes Rd, Magallanes, Cavite',
  'https://www.google.com/maps/place/Magallanes+Public+Market/@14.173872,120.7338412,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd85e47f00ae03:0x65b91b6f148b0154!8m2!3d14.173872!4d120.7364161!16s%2Fg%2F11t0vy0ng6?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.173872,
  120.7364161,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  14,
  'Lolo Pinoy''s Sport Center',
  'Sports and Recreation Facilities',
  '402 Tennis',
  'Others',
  2021,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'San Agustin',
  'San Agustin, Magallanes',
  'https://www.google.com/maps/place/Lolo+Pinoy''s+Sport+Center/@14.171148,120.7277563,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd853560193fcf:0x711a51f91131ec30!8m2!3d14.171148!4d120.7303312!16s%2Fg%2F11zk8m1t6b?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.171148,
  120.7303312,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Magallanes',
  15,
  'Fhv Cockpit Game Center',
  'Others',
  '901 Others (Please specify)',
  'Others',
  2015,
  'CALABARZON',
  'Cavite',
  'Magallanes',
  'Caluangan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Mendez-NuÃ±ez',
  1,
  'Paradizoo Theme Farm',
  'Others',
  '412 Leisure-land, Theme Park',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Mendez-NuÃ±ez',
  'Panungyan I',
  '493 Mendez - Tagaytay Rd, Mendez',
  'https://www.google.com/maps/place/Paradizoo+Theme+Park/@14.1279831,120.893335,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7802e059e3c1:0x5a79afc198f308ed!8m2!3d14.1279831!4d120.8959099!16s%2Fg%2F11bzvw9ldp?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1279831,
  120.8959099,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Mendez-NuÃ±ez',
  2,
  'Yoki''s Farm',
  'Others',
  '412 Leisure-land, Theme Park',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Mendez-NuÃ±ez',
  'Palocpoc I',
  'Tabluan Road, Barangay Palocpoc 1, Mendez, Cavite',
  'https://www.google.com/maps/place/Yoki''s+Farm/@14.1243381,120.8770278,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd9d4c1ca1d94f:0xf6acb8f69e0b8659!8m2!3d14.1243381!4d120.8796027!16s%2Fg%2F1pv1ct4wg?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1243381,
  120.8796027,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Mendez-NuÃ±ez',
  3,
  'St. Augustine Parish Church',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Mendez-NuÃ±ez',
  'Poblacion II',
  'Mendez - Tagaytay Rd, Mendez, Cavite',
  'https://www.google.com/maps/place/St.+Augustine+Parish+Church+-+Poblacion+II,+Mendez,+Cavite+(Diocese+of+Imus)/@14.1301439,120.9028894,17.25z/data=!4m10!1m2!2m1!1sSt.+Augustine+Parish+Church!3m6!1s0x33bd7805e30806e9:0xd362c62797b8e5ec!8m2!3d14.1306421!4d120.9045507!15sChtTdC4gQXVndXN0aW5lIFBhcmlzaCBDaHVyY2iSAQ9jYXRob2xpY19jaHVyY2jgAQA!16s%2Fg%2F11d_yw9kdk?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1306421,
  120.9045507,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Mendez-NuÃ±ez',
  4,
  'Mendez Ecological Park',
  'Nature',
  '199 Other Natural Attractions (e.g. century old trees/forest, endemic species)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Mendez-NuÃ±ez',
  'Asis II',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Noveleta',
  1,
  'Tribunal House of Noveleta',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Noveleta',
  'Poblacion',
  'Gen Antonio, Noveleta, Cavite',
  'https://www.google.com/maps/place/Noveleta+Tribunal/@14.4272276,120.8805385,19.5z/data=!4m10!1m2!2m1!1sTribunal+House+of+Noveleta!3m6!1s0x33962d0048ec96f3:0x103e59ab65125cf1!8m2!3d14.427192!4d120.8806757!15sChpUcmlidW5hbCBIb3VzZSBvZiBOb3ZlbGV0YZIBE2hpc3RvcmljYWxfbGFuZG1hcmvgAQA!16s%2Fg%2F11m6xhw7_q?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.427192,
  120.8806757,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Noveleta',
  2,
  'Daing Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Noveleta',
  'Poblacion',
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  1,
  'Diocesan Shrine and Parish of Our Lady of Candelaria',
  'History and Culture',
  'Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Poblacion 2',
  'J Rizal, Silang, Cavite',
  'https://www.google.com/maps/place/Diocesan+Shrine+and+Parish+Of+Nuestra+Se%C3%B1ora+de+Candelaria+(Diocese+of+Imus)/@14.2237906,120.9717012,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7e97334962a5:0x1b42c41c64104565!8m2!3d14.2237906!4d120.9742761!16s%2Fm%2F011px1jk?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.2237906,
  120.9742761,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  2,
  'Silang Town Fiesta',
  'History and Culture',
  'Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'All Barangays',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  3,
  'Sumilang Festival',
  'History and Culture',
  'Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'All Barangays',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  4,
  'Acienda Designer Outlet',
  'Shopping',
  'Malls, Department Stores',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lalaan 1',
  'KM48 Emilio Aguinaldo Hwy, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Acienda+Designer+Outlet+Mall/@14.1842214,120.9583338,17z/data=!4m10!1m2!2m1!1sAcienda+Designer+Outlet!3m6!1s0x33bd79a83b34572d:0x36bc8441e328ebe2!8m2!3d14.1835195!4d120.960441!15sChdBY2llbmRhIERlc2lnbmVyIE91dGxldFoZIhdhY2llbmRhIGRlc2lnbmVyIG91dGxldJIBC291dGxldF9tYWxs4AEA!16s%2Fg%2F11ql8b42w4?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.1835195,
  120.960441,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  5,
  'Perlas ng Silang',
  'Nature',
  'Parks',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Pulong Bunga',
  'Purok 5, Pulong Bunga, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Perlas+ng+Silang/@14.158525,120.9793189,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd792622f0b3cb:0x191d6d7439f21272!8m2!3d14.158525!4d120.9818938!16s%2Fg%2F11qbcdndyp?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D',
  14.158525,
  120.9818938,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  6,
  'Shambala Silang',
  'Others',
  'Museum',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Pulong Bunga',
  'Shambala Road, Purok 5 Pulong Bunga Road, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Shambala+Silang/@14.1699718,120.9792151,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd797ded9f15e3:0xd5e7e03a327c556f!8m2!3d14.1699666!4d120.98179!16s%2Fg%2F12lt1gk3m?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1699666,
  120.98179,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  7,
  'Gameroom Arts and Play Center',
  'Sports and Recreation Facilities',
  'Other Sports and Recreational Activities',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lalaan 1',
  'Unit 120, Acienda Designer Outlet Mall, Emilio Aguinaldo Hwy, Brgy. Lalaan 1, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Gameroom+Arts+and+Play+Center/@14.1832959,120.9568093,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd798b2f47cf17:0xab6f05f23c9c1f62!8m2!3d14.1832907!4d120.9593842!16s%2Fg%2F11y_vb6g3l?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1832907,
  120.9593842,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  8,
  'Riviera Golf Club, Inc.',
  'Sports and Recreation Facilities',
  'Golf',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'San Vicente 2',
  'Emilio Aguinaldo Hwy, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/The+Riviera+Golf+Club,+Inc./@14.2350549,120.9452489,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7ef05351a55f:0x7eff090dc125e3eb!8m2!3d14.2350497!4d120.9478238!16s%2Fg%2F1tdyc4wt?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2350497,
  120.9478238,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  9,
  'South Forbes Golf Driving Range',
  'Sports and Recreation Facilities',
  'Golf',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Inchican',
  'Silang',
  'https://www.google.com/maps/place/South+Forbes+golf+driving+range/@14.2448761,121.0328982,17z/data=!4m10!1m2!2m1!1sSouth+Forbes+Golf+Driving+Range!3m6!1s0x33bd7dc046b48a81:0x9a122197f3b8417!8m2!3d14.2448761!4d121.0362666!15sCh9Tb3V0aCBGb3JiZXMgR29sZiBEcml2aW5nIFJhbmdlkgELc3BvcnRzX2NsdWLgAQA!16s%2Fg%2F11t_zhtl3x?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2448761,
  121.0362666,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  10,
  'Gourmet Farms, Inc.',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lalaan 2',
  'Km., 52 Emilio Aguinaldo Hwy, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Gourmet+Farms/@14.3378584,120.8260017,11z/data=!4m10!1m2!2m1!1sGourmet+Farms,+Inc.!3m6!1s0x33bd79bb0bfc7949:0xf13365080afe0a2a!8m2!3d14.1466704!4d120.9566294!15sChNHb3VybWV0IEZhcm1zLCBJbmMuWhMiEWdvdXJtZXQgZmFybXMgaW5jkgEMY29mZmVlX3N0b3JlmgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDJ4Q2FtTlljSGhPVjNob1RtdE9VVTF0VGpKUFYxcFJaRlUwTTFwVlJSQULgAQD6AQQIaBAm!16s%2Fg%2F1tdpjm9r?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1466704,
  120.9566294,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  11,
  'Auspere Nature Farm',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lumil',
  'Purok 4 Bgy. Lumil, Sta. Rosa-Tagaytay Road, Silang Metro Tagaytay, Cavite',
  'https://www.google.com/maps/place/Auspere+Nature+Farm/@14.1789076,121.010271,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7b510cebed81:0x8cb57e5c72ce71e2!8m2!3d14.1789024!4d121.0128459!16s%2Fg%2F11j6td9b0_?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1789024,
  121.0128459,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  12,
  'Ilog Maria Honeybee Farms',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lalaan 1',
  '#7 KM 47 Ilog Maria Honeybee Farm, 4118 Emilio Aguinaldo Hwy, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Ilog+Maria/@14.1899691,120.9652689,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd79364c4a175b:0x78e7464a329e549d!8m2!3d14.1899639!4d120.9678438!16s%2Fg%2F1tfbqdxz?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1899639,
  120.9678438,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  13,
  'Pedro Farms',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Hukay',
  'Hukay Rd, Silang, Cavite',
  'https://www.google.com/maps/place/Pedro+Farms/@14.2151358,121.0011931,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7db78a0a0413:0xe5e1901b6ae6298f!8m2!3d14.2151306!4d121.003768!16s%2Fg%2F11fhzs538q?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2151306,
  121.003768,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  14,
  'Old Kano Farm',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lalaan 1',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  15,
  'Cornerstone Pottery',
  'Others',
  'Arts and Craft',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Balubad 1',
  'Balubad 1 Cornerstone, B1084 Balubad 1st Road, Service Road, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/Cornerstone+Pottery+Farm/@14.1950076,120.9472308,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd792e42c8a8cd:0x5a2270faad08529b!8m2!3d14.1950024!4d120.9498057!16s%2Fg%2F11b6gcp8st?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1950024,
  120.9498057,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  16,
  'PNPA Museum',
  'Others',
  'Education Tourism',
  'Education Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Tartaria',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  17,
  'Santis Delicatessen',
  'Health and Wellness',
  'Local Specialty Restaurant',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Buho',
  'Km. 52, Buho, Emilio Aguinaldo Hwy, Silang, 4118 Cavite',
  'https://www.google.com/maps/place/S%C3%84NTIS+Delicatessen+Silang/@14.389068,120.8475781,11z/data=!4m10!1m2!2m1!1sSantis+Delicatessen!3m6!1s0x33bd7909b748a0f5:0xd43677fd367775e!8m2!3d14.143231!4d120.9556259!15sChNTYW50aXMgRGVsaWNhdGVzc2VuIgOIAQFaFSITc2FudGlzIGRlbGljYXRlc3NlbpIBEHN3aXNzX3Jlc3RhdXJhbnTgAQA!16s%2Fg%2F1hc2y39ww?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.143231,
  120.9556259,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Silang',
  18,
  'Teofely''s Nature Farm',
  'Nature',
  'Farm / Ranch',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Silang',
  'Lumil',
  'Brgy, J. Humarang St, Santa Rosa - Tagaytay Rd, Lumil, Silang, Cavite',
  'https://www.google.com/maps/place/Teofely+Gardens+Wedding+%26+Events+Venue/@14.1775325,121.0038298,17z/data=!4m10!3m9!1s0x33bd7beb91c00669:0xcfe964dc6b145d19!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.1775273!4d121.0064047!16s%2Fg%2F1tfkyr1y?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1775273,
  121.0064047,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  1,
  '41st Division USSAFE Shrine',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Kaybagal South',
  'Kaybagal South, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/41st+Division+Shrine/@14.0956055,120.9365881,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd77a0d7927047:0x6174c3c1d8176fef!8m2!3d14.0956003!4d120.939163!16s%2Fg%2F11c2md6lvq?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.0956003,
  120.939163,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  2,
  'Angels Hills',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Maitim 2nd East',
  'Arnoldus Road, Barangay Maitim II East, Emilio Aguinaldo Highway, Tagaytay City, Cavite, 4120',
  'https://www.google.com/maps/place/Angels+Hills+Retreat+and+Formation+Center/@14.1251443,120.9590333,17z/data=!4m6!3m5!1s0x33bd79dcaf88b517:0x822977e2323134b1!8m2!3d14.1258258!4d120.9616726!16s%2Fg%2F1pzsmt6ft?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1258258,
  120.9616726,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  3,
  'Brilliant Sky',
  'Sports and Recreation Facilities',
  '412 Leisure-land, Theme Park',
  'Leasure and Entertainment Tourism',
  2018,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Zambal',
  '124 Zambal Rd, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Brilliant+Sky+Hotel+and+Leisure+Park/@14.091678,120.9016935,17z/data=!4m10!3m9!1s0x33bd772076157491:0x715ef9cd4dfd76ea!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.0916728!4d120.9042684!16s%2Fg%2F11rfmvzyv2?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.0916728,
  120.9042684,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  4,
  'Ina ng Laging Saklolo Parish',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  1997,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Sungay East',
  'Tagaytay - Calamba Rd, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Ina+ng+Laging+Saklolo+Parish/@14.1242949,120.9793578,16z/data=!4m10!1m2!2m1!1sIna+ng+Laging+Saklolo+Parish!3m6!1s0x33bd7a1d6b74f1e1:0x1fe3f12f3bf19567!8m2!3d14.1242949!4d120.9873692!15sChxJbmEgbmcgTGFnaW5nIFNha2xvbG8gUGFyaXNoWh4iHGluYSBuZyBsYWdpbmcgc2FrbG9sbyBwYXJpc2iSAQ9jYXRob2xpY19jaHVyY2iaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUm9iR1poYkVSUkVBReABAPoBBAgAECc!16s%2Fg%2F1tk6mw4p?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1242949,
  120.9873692,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  5,
  'Little Souls - Sisters of the Merciful Souls',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Patutong Malaki South',
  'Mahofany Avenue, Enrile Road, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Little+Souls+Sisters+Convent/@14.1055134,120.9259575,18.5z/data=!4m10!1m2!2m1!1sLittle+Souls+-+Sisters+of+the+Merciful+Souls!3m6!1s0x33bd77973c9bbfb5:0x6510014fa5c0ce7f!8m2!3d14.1057932!4d120.9282267!15sCixMaXR0bGUgU291bHMgLSBTaXN0ZXJzIG9mIHRoZSBNZXJjaWZ1bCBTb3Vsc1osIipsaXR0bGUgc291bHMgc2lzdGVycyBvZiB0aGUgbWVyY2lmdWwgc291bHOSAQdudW5uZXJ54AEA!16s%2Fg%2F11bz_1w5r2?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1057932,
  120.9282267,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  6,
  'Museo Orlina',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  2014,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Francisco',
  'Hollywood Subdivision Road Brgy, Subd, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Museo+Orlina/@14.1251476,120.9778948,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd79f7ee61bdc9:0xfd2160515d1356c8!8m2!3d14.1251424!4d120.9804697!16s%2Fg%2F1ptxwztgx?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1251424,
  120.9804697,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  7,
  'Our Lady of Lourdes Parish',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  1940,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Silang Crossing East',
  'Tagaytay - Nasugbu Hwy, Silang Junction North, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Our+Lady+of+Lourdes+Parish/@14.111319,120.9540232,17z/data=!4m10!1m2!2m1!1sOur+Lady+of+Lourdes+Parish!3m6!1s0x33bd7764459f8ce3:0xe729ecd446058e72!8m2!3d14.111319!4d120.9573916!15sChpPdXIgTGFkeSBvZiBMb3VyZGVzIFBhcmlzaFocIhpvdXIgbGFkeSBvZiBsb3VyZGVzIHBhcmlzaJIBD2NhdGhvbGljX2NodXJjaJoBJENoZERTVWhOTUc5blMwVkpRMEZuU1VSbGJtSkliVGQzUlJBQuABAPoBBAgAEDU!16s%2Fg%2F1v41xzyh?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.111319,
  120.9573916,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  8,
  'People''s Park in the Sky',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  1983,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Dapdap West',
  'Tagaytay - Calamba Rd, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/People''s+Park+in+the+Sky/@14.1416719,121.0193695,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7a50279ccecb:0xa2d2549c452ac1e8!8m2!3d14.1416667!4d121.0219444!16s%2Fm%2F0k9vm87?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1416667,
  121.0219444,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  9,
  'Pink Sisters Convent',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  1990,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Maitim 2nd East',
  'Pink Sisters Convent, Brgy 08 Holy Spirit Drive, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Pink+Sisters''+Convent+and+Chapel/@14.3744389,120.6679198,10z/data=!4m10!1m2!2m1!1sPink+Sisters+Convent!3m6!1s0x33bd79dd0f8edfab:0x8cd3bfa18cfba9a6!8m2!3d14.1263897!4d120.9626229!15sChRQaW5rIFNpc3RlcnMgQ29udmVudFoWIhRwaW5rIHNpc3RlcnMgY29udmVudJIBFXJlbGlnaW91c19kZXN0aW5hdGlvbuABAA!16s%2Fg%2F1tfrzm0h?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1263897,
  120.9626229,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  10,
  'Puzzle Mansion Museum',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  2012,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Asisan',
  'Brgy I. Cuadra, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Puzzle+Mansion/@14.0973787,120.8999686,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd77dba7e2f27d:0x26e6e3eb1d52c304!8m2!3d14.0973735!4d120.9025435!16s%2Fg%2F11c5s_l4c6?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.0973735,
  120.9025435,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  11,
  'Residence Inn',
  'Sports and Recreation Facilities',
  '404 Zoo and Botanical Garden',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Neogan',
  'Tagaytay - Nasugbu Hwy, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Residence+Inn/@14.0876068,120.8916435,17z/data=!4m10!3m9!1s0x33bd77d3f052dba3:0xc1913d2e3159f0f!5m3!1s2026-08-29!4m1!1i2!8m2!3d14.0876016!4d120.8942184!16s%2Fg%2F1thscgbn?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.0876016,
  120.8942184,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  12,
  'Skyranch Tagaytay',
  'Sports and Recreation Facilities',
  '412 Leisure-land, Theme Park',
  'Leasure and Entertainment Tourism',
  2013,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Kaybagal South',
  'Km. 60 Tagaytay - Nasugbu Hwy, Kaybagal South, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Sky+Ranch+Tagaytay/@14.0952829,120.9351749,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd77a47742a5ad:0x60823aa4bd31ebad!8m2!3d14.0952777!4d120.9377498!16s%2Fg%2F11j45bglv_?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.0952777,
  120.9377498,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  13,
  'SVD (Divine Word Seminary)',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. San Jose',
  'SVD Road, Tagaytay City, 4120, Cavite, SVD Rd, Mag-Asawang Ilat, Tagaytay City, 4120 Cavite',
  'https://www.google.com/maps/place/Divine+Word+Seminary/@14.1279403,120.9654037,3a,75y,319.72h,95.96t/data=!3m8!1e1!3m6!1sCIHM0ogKEICAgICJ9dyNJg!2e10!3e11!6shttps:%2F%2Flh3.googleusercontent.com%2Fgpms-cs-s%2FAFP8RcPfOpDqzDTz7k96_rQRb9_azyrqjO51GWaPrseGEucdmJQ0Kcxrc4l8Dzgsav0i4-ZjBy-ZJrpUn4LpYzDxUV2blHslCnF3Dny5IUTcxl46V2Cfc80tW5_8vGT2llUXmfvzS25W%3Dw900-h600-k-no-pi-5.956409778015328-ya163.71976585999607-ro0-fo100!7i8704!8i4352!4m10!1m2!2m1!1sSVD+(Divine+Word+Seminary)!3m6!1s0x33bd7a0469632a8b:0x8c2e89700432f2ba!8m2!3d14.1279031!4d120.9654259!15sChpTVkQgKERpdmluZSBXb3JkIFNlbWluYXJ5KSIDiAEBkgEIc2VtaW5hcnngAQA!16s%2Fm%2F026ndwg?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1279031,
  120.9654259,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  14,
  'Tagaytay Picnic Grove',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Leasure and Entertainment Tourism',
  1964,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Sungay East',
  'Tagaytay-Calamba Road, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Tagaytay+Picnic+Grove/@14.1257148,120.9963139,18.75z/data=!4m6!3m5!1s0x33bd7a1a6c9c60b7:0xf6fa7952c4afb554!8m2!3d14.1247161!4d120.9977949!16s%2Fm%2F0k9vm9c?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1247161,
  120.9977949,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  15,
  'Tagaytay Ridge Landing Site',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Silang Crossing East',
  'Silang Junction North, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Tagaytay+Ridge+Landing+Historical+Marker/@14.1153376,120.9594023,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd77c804a4c1c1:0xd5a4a61b0d224caa!8m2!3d14.1153324!4d120.9619772!16s%2Fg%2F11h4dgqddm?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1153324,
  120.9619772,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  16,
  'The Franciscan Missionary of Mary',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. San Jose',
  'Tagaytay - Calamba Rd, Tagaytay City, Cavite',
  'https://www.google.com/maps/place/Franciscan+Missionaries+of+Mary+Tagaytay/@14.115348,120.9594023,17z/data=!4m10!1m2!2m1!1sThe+Franciscan+Missionary+of+Mary!3m6!1s0x33bd79dffe012029:0x6640f35d4b22d571!8m2!3d14.1170952!4d120.9645473!15sCiFUaGUgRnJhbmNpc2NhbiBNaXNzaW9uYXJ5IG9mIE1hcnlaIyIhdGhlIGZyYW5jaXNjYW4gbWlzc2lvbmFyeSBvZiBtYXJ5kgEHbWlzc2lvbpoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQya3hkbFZxVm01VFYyUndVVmRSZVZwWVNuQlpNbFo1VFZSamVXRnNSUkFC4AEA-gEECAAQIg!16s%2Fg%2F1tfb8p9n?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.1170952,
  120.9645473,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tagaytay City',
  17,
  'Tierra De Maria',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  2000,
  'CALABARZON',
  'Cavite',
  'Tagaytay City',
  'Brgy. Sungay East',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  1,
  'Diocesan Shrine of San Agustin Parish of Sta. Cruz',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  1780,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Poblacion I',
  NULL,
  'https://www.google.com/maps/place/Diocesan+Shrine+of+Saint+Augustine+and+Parish+of+the+Holy+Cross+-+Tanza/@14.4010511,120.8568986,19z/data=!4m6!3m5!1s0x33962cf34acc76d3:0xf0518a8d67f72212!8m2!3d14.4013301!4d120.8568484!16s%2Fg%2F1tf055jj?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.4013301,
  120.8568484,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  2,
  'Plaza de San Agustin',
  'History and Culture',
  '411 Parks',
  'Cultural Tourism',
  2018,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Poblacion I',
  NULL,
  'https://www.google.com/maps/place/Plaza+de+San+Agustin/@14.4007362,120.8567612,19z/data=!3m1!4b1!4m6!3m5!1s0x33962daf759785f1:0xb7b602b61c0c794!8m2!3d14.4007349!4d120.8574049!16s%2Fg%2F11ry7vsv7z?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.4007349,
  120.8574049,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  3,
  'Dominador Buhain Foundation Inc.',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Tanauan',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  4,
  'Sta. Cruz Convent Museum',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  1780,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Poblacion I',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  5,
  'Casa Hacienda de Tanza',
  'History and Culture',
  '205 Museum',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Biwas',
  NULL,
  'https://www.google.com/maps/place/Casa+Hacienda+de+Tanza+(Santa+Cruz+de+Malabon)/@14.4046066,120.8543102,9a,75y,82.56h,90t/data=!3m7!1e1!3m5!1s5J7Pj1C09WIKJqQkUW65gw!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3D5J7Pj1C09WIKJqQkUW65gw%26yaw%3D82.55572568479235!7i16384!8i8192!4m14!1m7!3m6!1s0x33962dc5c50304cb:0xa1bfaef6014c4632!2sCasa+Hacienda+de+Tanza+(Santa+Cruz+de+Malabon)!8m2!3d14.4041944!4d120.8529313!16s%2Fg%2F11fp3mdks8!3m5!1s0x33962dc5c50304cb:0xa1bfaef6014c4632!8m2!3d14.4041944!4d120.8529313!16s%2Fg%2F11fp3mdks8?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.4041944,
  120.8529313,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  6,
  'Tanza Town',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  7,
  'Lohitor Festival',
  'Customs and Traditions',
  '602 Festivals (e.g. official or de facto cultural heritage/community related)',
  'Cultural Tourism',
  2014,
  'CALABARZON',
  'Cavite',
  'Tanza',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'yellow',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  8,
  'Julugan Fish Terminal',
  'Industrial Tourism',
  '303 Fishery',
  'Cultural Tourism',
  1984,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Julugan V',
  '064 Fish Terminal Rd, Tanza, Cavite',
  'https://www.google.com/maps/place/Julugan+Fish+Terminal/@14.4043249,120.8391528,17z/data=!3m1!4b1!4m6!3m5!1s0x33962deadabfc2d5:0xf36299a43c7c820!8m2!3d14.4043197!4d120.8417277!16s%2Fg%2F11klzw6jkp?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.4043197,
  120.8417277,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  9,
  'SM Tanza',
  'Shopping',
  '501 Malls, Department Stores',
  'Leasure and Entertainment Tourism',
  2022,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Daang Amaya II',
  NULL,
  'https://www.google.com/maps/place/SM+City+Tanza/@14.3923474,120.8502012,18.5z/data=!4m14!1m7!3m6!1s0x33962d74c4ba01fb:0xfc5d27fdeef2731c!2sMikana+SM+City+Tanza!8m2!3d14.3922057!4d120.8505442!16s%2Fg%2F11gy7gxb92!3m5!1s0x33962d0040bfee2d:0x3448f048d9ae44da!8m2!3d14.3924662!4d120.8519996!16s%2Fg%2F11nc4651wb?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.3922057,
  120.8505442,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  10,
  'Vista Mall Tanza',
  'Shopping',
  '501 Malls, Department Stores',
  'Leasure and Entertainment Tourism',
  2018,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Punta II',
  'Tanza - Trece Martires Rd, Brngy. Punta 2, Tanza, Cavite',
  'https://www.google.com/maps/place/Vista+Mall+Tanza/@14.3420698,120.8564457,17z/data=!3m1!4b1!4m6!3m5!1s0x33962b030c0c9c27:0x66aaffa5044bf337!8m2!3d14.3420646!4d120.8590206!16s%2Fg%2F11f4t_tbv4?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.3420646,
  120.8590206,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  11,
  'Arden Botanical Garden',
  'Nature',
  '302 Farm / Ranch',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Tanauan',
  'Governor''s Dr, Cabuco, Tanza, Cavite',
  'https://www.google.com/maps/place/Arden+Botanical+Estate/@14.2849253,120.7754647,13z/data=!4m10!1m2!2m1!1sArden+Botanical+Garden!3m6!1s0x33bd81bccde26de9:0x416f62b5fe83547f!8m2!3d14.2933195!4d120.827809!15sChZBcmRlbiBCb3RhbmljYWwgR2FyZGVuWhgiFmFyZGVuIGJvdGFuaWNhbCBnYXJkZW6SARVyZWFsX2VzdGF0ZV9kZXZlbG9wZXKaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjVLYlZFemFFcE5WWFF5VVd0MFNtTkljREJoV0ZaeFkwaHdVbFJzUlJBQuABAPoBBAgREB4!16s%2Fg%2F11fq1jlrzk?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2933195,
  120.827809,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  12,
  'Profeta Integrated Farm',
  'Nature',
  '302 Farm / Ranch',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Paradahan',
  NULL,
  'https://www.google.com/maps/place/Profeta+Integrated+Farm/@14.3318407,120.8335615,18.25z/data=!4m6!3m5!1s0x33962bea5dda4be3:0xa71098beaffdd7c8!8m2!3d14.3321748!4d120.833963!16s%2Fg%2F11h1dglgn7?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.3321748,
  120.833963,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Tanza',
  13,
  'Food Bazaar',
  'Special Events',
  '502 Open Air Market, Traditional Market Area',
  NULL,
  NULL,
  'CALABARZON',
  'Cavite',
  'Tanza',
  'Mulawin',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  1,
  'Bantayog ng Labintatlong Martyr ng Cavite',
  'History and Culture',
  '204 Historic Monuments',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'San Agustin',
  'Thirteen Martys Avenue, Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Labintatlong+Martir+ng+Kabite+Historical+Marker/@14.2809308,120.8707971,20.75z/data=!4m15!1m8!3m7!1s0x33bd806c904e21f5:0x3d02ac7c8990cbe1!2sBantayog+ng+Labintatlong+Martir+ng+Kabite,+Juanito+R.+Remulla+Senior+Rd,+Trece+Martires+City,+4109+Cavite!3b1!8m2!3d14.2809411!4d120.8708272!16s%2Fg%2F12hm5ssb6!3m5!1s0x33bd81430db10e3d:0xa23d2dbeb46e1a6e!8m2!3d14.2809459!4d120.8708042!16s%2Fg%2F11fm78psx2?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2809411,
  120.8708272,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  2,
  'St. Jude Thaddeus Church',
  'History and Culture',
  '202 Church, Mosque, temples or other religious sites',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'San Agustin',
  'Luciano (Bitangan) , 4109 Trece Martires City , Cavite',
  'https://www.google.com/maps/place/St.+Jude+Thaddeus+Parish+Church+-+San+Agustin,+Trece+Martires+City,+Cavite+(Diocese+of+Imus)/@14.281985,120.5648711,11z/data=!4m10!1m2!2m1!1sSt.+Jude+Thaddeus+Church!3m6!1s0x33bd8038ea0bb77f:0x1cccf99600efafe7!8m2!3d14.281985!4d120.8697417!15sChhTdC4gSnVkZSBUaGFkZGV1cyBDaHVyY2haGSIXc3QganVkZSB0aGFkZGV1cyBjaHVyY2iSAQ9jYXRob2xpY19jaHVyY2iaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnRPTldOcVJYUmxXR2g1VVhwTmVWUnFUWGxZTTBKVFZVZEdkR0ZzUlJBQuABAPoBBAgAEDY!16s%2Fg%2F11bc7tp9m2?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.281985,
  120.8697417,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  3,
  'Mina Tunnel',
  'History and Culture',
  '901 Others (Please specify)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabezas',
  'Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Mina+Falls/@14.262387,120.8947203,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd7f8840986531:0x7b4cefb23d8bd2c5!8m2!3d14.2623818!4d120.8972952!16s%2Fg%2F11g6hr11rl?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2623818,
  120.8972952,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  4,
  'Old Cavite Provincial Capitol Building',
  'History and Culture',
  '206 Structures and Buildings',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'San Agustin',
  'Capitol Rd, Trece Martires City, 4109 Cavite',
  'https://www.google.com/maps/place/Old+Cavite+Provincial+Capitol/@14.2827219,120.8553404,16z/data=!4m10!1m2!2m1!1sOld+Cavite+Provincial+Capitol+Building!3m6!1s0x33bd80695908e387:0xa0afb75bd0982a4c!8m2!3d14.2799843!4d120.8667591!15sCiZPbGQgQ2F2aXRlIFByb3ZpbmNpYWwgQ2FwaXRvbCBCdWlsZGluZ5IBF2xvY2FsX2dvdmVybm1lbnRfb2ZmaWNl4AEA!16s%2Fg%2F11bwqpt57x?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2799843,
  120.8667591,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  5,
  'New Cavite Provincial Capitol BUilding',
  'History and Culture',
  '206 Structures and Buildings',
  'Cultural Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabuco',
  'Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Cavite+Provincial+Capitol/@14.2872918,120.8502655,17z/data=!4m10!1m2!2m1!1sNew+Cavite+Provincial+Capitol+BUilding!3m6!1s0x33bd81f26db9271b:0x75a9e03fd1e8fa25!8m2!3d14.2854389!4d120.8542214!15sCiZOZXcgQ2F2aXRlIFByb3ZpbmNpYWwgQ2FwaXRvbCBCVWlsZGluZ1ooIiZuZXcgY2F2aXRlIHByb3ZpbmNpYWwgY2FwaXRvbCBidWlsZGluZ5IBF2xvY2FsX2dvdmVybm1lbnRfb2ZmaWNlmgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDJwQ2QxTXpXakpTV0ZwdVRsUkJlR0pIVW5OalZWSldVMWRyZVdWSVl4QULgAQD6AQQIABA_!16s%2Fg%2F11khdk_g5q?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2854389,
  120.8542214,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  6,
  'Paliguang Bayan - Cabezas',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabezas',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  7,
  'Paliguang bayan - Cabuco',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabuco',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  8,
  'Paliguang Bayan - Conchu',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Conchu',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  9,
  'Paliguang Bayan - De Ocampo',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'De Ocampo',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  10,
  'Paliguang Bayan - Hugo Perez',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Hugo Perez',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  11,
  'Paliguang Bayan - San Agustin',
  'Nature',
  '104 River and Landscape (includes subterranean rivers)',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'San Agustin',
  NULL,
  NULL,
  NULL,
  NULL,
  'none',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  12,
  'Sherwood Hills Golf and Country Club',
  'Sports and Recreation Facilities',
  '401 Golf',
  'Leasure and Entertainment Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabezas',
  'Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Sherwood+Hills+Golf+Course/@14.2589299,120.890092,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd80295776f5c3:0x1003883387d28667!8m2!3d14.2589247!4d120.8926669!16s%2Fg%2F1tgd41gk?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2589247,
  120.8926669,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  13,
  'Forest Park',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Luciano',
  'IV A - Southern Tagalog, Marcius Ave, Trece Martires City, 4109 Cavite',
  'https://www.google.com/maps/place/Trece+Martires+Forest+Park/@14.2702498,120.8582506,15.29z/data=!4m10!1m2!2m1!1sForest+Park!3m6!1s0x33bd8041ce40cbcf:0xff635d93eb41f430!8m2!3d14.2739264!4d120.8694113!15sCgtGb3Jlc3QgUGFya1oNIgtmb3Jlc3QgcGFya5IBBHBhcmuaASNDaFpEU1VoTk1HOW5TMFZKUTBGblNVUlFjelJVU0VOM0VBReABAPoBBQiSARAj!16s%2Fg%2F11c53j5v9f?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2739264,
  120.8694113,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  14,
  'Peoples Park',
  'Sports and Recreation Facilities',
  '411 Parks',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Lapidario',
  'Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Trece+Martires+People''s+Park/@14.2812335,120.8612492,19.71z/data=!4m10!1m2!2m1!1sPeoples+Park!3m6!1s0x33bd81331fd259a5:0x17f5812d00e9c84e!8m2!3d14.2818242!4d120.8618748!15sCgxQZW9wbGVzIFBhcmtaDiIMcGVvcGxlcyBwYXJrkgEEcGFya5oBI0NoWkRTVWhOTUc5blMwVkpRMEZuU1VOQ2FHTllNMGQzRUFF4AEA-gEECAAQRg!16s%2Fg%2F11rfmx2d41?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2818242,
  120.8618748,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  15,
  'Mayang Falls',
  'Nature',
  '102 Falls',
  'Nature Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Conchu',
  '5 Conchu Rd, Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Mayang+Falls/@14.2410652,120.8879948,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd81d98cc2c0c5:0xf6bab33ce5a0ecf8!8m2!3d14.24106!4d120.8905697!16s%2Fg%2F11c2j3ndyg?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.24106,
  120.8905697,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  16,
  'Lola''s Plates and Pours',
  'Others',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Hugo Perez',
  'Hugo Perez Rd, Purok 4, Trece Martires City, 4109 Cavite',
  'https://www.google.com/maps/place/Lola''s+Plates+and+Pours+Restaurant/@14.2891551,120.8884359,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd81025491f82b:0xe5ee9549d784dddd!8m2!3d14.2891499!4d120.8910108!16s%2Fg%2F11trhwxr0w?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2891499,
  120.8910108,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  17,
  'Top''s Food Enterprises',
  'Others',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'San Agustin',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  18,
  'Kanlungan CafÃ©',
  'Others',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Cabuco',
  'Cabuco, Trece Martires City, Cavite',
  'https://www.google.com/maps/place/Kanlungan+Cafe/@14.2825871,120.8467133,17z/data=!3m1!4b1!4m6!3m5!1s0x33bd8132cbcfc4bf:0xc8a53da42cc8bbae!8m2!3d14.2825819!4d120.8492882!16s%2Fg%2F11r8d7ly_7?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2825819,
  120.8492882,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  19,
  'Publico CafÃ© and Restaurant',
  'Others',
  '601 Local Specialty Restaurant',
  'Others',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Lapidario',
  'Talisayan Rd, Lapidario (Bayog), Trece Martires City, 4109 Cavite',
  'https://www.google.com/maps/place/Publico/@14.2826719,120.8080884,13z/data=!4m10!1m2!2m1!1sPublico+Caf%C3%A9+and+Restaurant!3m6!1s0x33bd81287fc10615:0x9eefc41fc3a49092!8m2!3d14.2780584!4d120.8610151!15sChxQdWJsaWNvIENhZsOpIGFuZCBSZXN0YXVyYW50Wh4iHHB1YmxpY28gY2Fmw6kgYW5kIHJlc3RhdXJhbnSSAQpyZXN0YXVyYW50mgEkQ2hkRFNVaE5NRzluUzBWUVF6ZGZUa3hzYlUxWE5IRkJSUkFC4AEA-gEECAAQOA!16s%2Fg%2F11vc29n4dj?entry=ttu&g_ep=EgoyMDI2MDgwNC4wIKXMDSoASAFQAw%3D%3D',
  14.2780584,
  120.8610151,
  'none',
  TRUE
);

INSERT INTO public.sta_v3_cavite_2025
  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,
   address, google_maps_link, latitude, longitude, highlight, is_listed)
VALUES (
  'Trece Martires City',
  20,
  'Beautifed Beauty Lounge',
  'Others',
  '803 Spa',
  'Heatlh, Wellness, and Retirement Tourism',
  NULL,
  'CALABARZON',
  'Cavite',
  'Trece Martires City',
  'Hugo Perez',
  NULL,
  NULL,
  NULL,
  NULL,
  'red',
  FALSE
);

COMMIT;


-- Catalog view: STA membership + Maps-link coords; images/hours from tourist_attractions.
-- is_published follows is_listed (hide incomplete / red / yellow rows).

CREATE OR REPLACE VIEW public.v_sta_v3_cavite_2025_catalog
WITH (security_invoker = true)
AS
SELECT
  COALESCE(ta.establishment_public_id, s.id) AS establishment_public_id,
  ta.ta_id,
  s.ta_name,
  COALESCE(
    NULLIF(trim(s.address), ''),
    NULLIF(trim(ta.address), ''),
    NULLIF(
      concat_ws(
        ', ',
        NULLIF(trim(s.barangay), ''),
        NULLIF(trim(s.city_mun), ''),
        NULLIF(trim(s.prov_huc), ''),
        'Philippines'
      ),
      'Philippines'
    )
  ) AS address,
  s.latitude::double precision AS latitude,
  s.longitude::double precision AS longitude,
  ta.picture,
  COALESCE(ta.gallery_urls, ARRAY[]::TEXT[]) AS gallery_urls,
  COALESCE(
    NULLIF(trim(ta.description), ''),
    concat_ws(
      '. ',
      NULLIF('NTDP: ' || NULLIF(trim(s.ntdp_category), ''), 'NTDP: '),
      NULLIF('Barangay: ' || NULLIF(trim(s.barangay), ''), 'Barangay: '),
      'STA-v3 Cavite 2025 (' || COALESCE(NULLIF(trim(s.city_mun), ''), s.sheet_name) || ')'
    )
  ) AS description,
  NULLIF(
    concat_ws(
      ' â€“ ',
      to_char(ta.opening_hours, 'HH24:MI'),
      to_char(ta.closing_hours, 'HH24:MI')
    ),
    ''
  ) AS hours,
  s.is_listed AS is_published,
  COALESCE(ta.created_at, s.created_at) AS created_at,
  ta.updated_at,
  COALESCE(c.city_name, s.city_mun) AS city_mun,
  COALESCE(tc.type_code, s.type_code) AS type_code,
  COALESCE(tac.category_name, s.ta_category) AS type,
  COALESCE(nc.ntdp_category_name, s.ntdp_category) AS ntdp_category
FROM public.sta_v3_cavite_2025 s
LEFT JOIN public.tourist_attractions ta
  ON lower(trim(ta.ta_name)) = lower(trim(s.ta_name))
LEFT JOIN public.cities c ON c.city_id = ta.city_id
LEFT JOIN public.type_codes tc ON tc.type_code_id = ta.type_code_id
LEFT JOIN public.ta_categories tac ON tac.category_id = ta.ta_categories_id
LEFT JOIN public.ntdp_categories nc ON nc.ntdp_category_id = ta.ntdp_category_id;

GRANT SELECT ON public.v_sta_v3_cavite_2025_catalog TO anon, authenticated;
