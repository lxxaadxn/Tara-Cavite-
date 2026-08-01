-- Remove places/tourist_attracted backfill; keep curated tourist_attractions only (ta_id <= 504 → 171 rows).
DELETE FROM public.place_reviews pr
WHERE pr.place_id IN (
  SELECT establishment_public_id FROM public.tourist_attractions WHERE ta_id > 504
);

DELETE FROM public.saved_list_items sli
WHERE sli.place_id IN (
  SELECT establishment_public_id FROM public.tourist_attractions WHERE ta_id > 504
);

DELETE FROM public.tourist_attractions WHERE ta_id > 504;

SELECT setval(
  'public.tourist_attractions_ta_id_seq',
  COALESCE((SELECT max(ta_id) FROM public.tourist_attractions), 1),
  true
);
