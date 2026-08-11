-- Upsert STA Excel type_code / ntdp_category into lookup tables (import-sta-v3-flat-table.mjs)
-- Does NOT insert cities or ta_categories — those come from your existing tables.
-- Sync serial sequences first (avoids ntdp_categories_pkey / type_codes_pkey 23505).
-- Case-insensitive match; does not truncate existing lookup rows.
BEGIN;

SELECT setval(
  pg_get_serial_sequence('public.type_codes', 'type_code_id'),
  COALESCE((SELECT MAX(type_code_id) FROM public.type_codes), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('public.ntdp_categories', 'ntdp_category_id'),
  COALESCE((SELECT MAX(ntdp_category_id) FROM public.ntdp_categories), 1),
  true
);

COMMIT;