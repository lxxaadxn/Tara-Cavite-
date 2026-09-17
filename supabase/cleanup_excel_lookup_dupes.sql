-- One-shot cleanup: remove cities / ta_categories that were inserted from the
-- earlier Excel lookups seed and are unused by sta_v3_cavite_2025 text labels.
-- Keep rows that match your canonical table set (see data/sta_lookup_snapshots.json).

BEGIN;

-- Excel-only city spellings (not in canonical cities snapshot)
DELETE FROM public.cities c
WHERE lower(trim(c.city_name)) IN (
  lower('City of Dasmariñas'),
  lower('Imus City'),
  lower('General Trias City'),
  lower('Tagaytay City'),
  lower('Trece Martires City')
)
AND NOT EXISTS (
  SELECT 1 FROM public.sta_v3_cavite_2025 s
  WHERE lower(trim(s.city_mun)) = lower(trim(c.city_name))
);

-- Excel coded / freeform TA category labels that are not canonical table names.
DELETE FROM public.ta_categories tac
WHERE (
  tac.category_name ~ '^[0-9]{3}\\s'
  OR lower(trim(tac.category_name)) IN (
    lower('Church, Mosque, temples or other religious sites'),
    lower('Churches, Temples, and Places of Worship'),
    lower('Customs and Traditions'),
    lower('Farm / Ranch'),
    lower('Festivals (e.g. official or de facto cultural heritage/community related)'),
    lower('Government Structures, Private Structures, and Commercial Establishments'),
    lower('Heritage Houses/Vernacular Architecture'),
    lower('Historical Site'),
    lower('Malls, Department Stores'),
    lower('Monuments and Markers'),
    lower('Natural Geological and Physiographical / Land  Formations'),
    lower('Park'),
    lower('Rehearsal Studio'),
    lower('Special Events'),
    lower('Burial Site'),
    lower('901 Others (Please specify)')
  )
)
AND NOT EXISTS (
  SELECT 1 FROM public.sta_v3_cavite_2025 s
  WHERE lower(trim(s.ta_category)) = lower(trim(tac.category_name))
);

COMMIT;
