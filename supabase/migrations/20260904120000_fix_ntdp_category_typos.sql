-- Fix duplicate misspelled NTDP categories in lookups + STA rows.
-- Leasure → Leisure; Heatlh → Health

UPDATE public.sta_v3_cavite_2025
SET ntdp_category = 'Leisure and Entertainment Tourism'
WHERE ntdp_category = 'Leasure and Entertainment Tourism';

UPDATE public.sta_v3_cavite_2025
SET ntdp_category = 'Health, Wellness, and Retirement Tourism'
WHERE ntdp_category = 'Heatlh, Wellness, and Retirement Tourism';

UPDATE public.sta_v3_cavite_2025
SET description = replace(
  description,
  'NTDP: Leasure and Entertainment Tourism',
  'NTDP: Leisure and Entertainment Tourism'
)
WHERE description LIKE '%NTDP: Leasure and Entertainment Tourism%';

UPDATE public.sta_v3_cavite_2025
SET description = replace(
  description,
  'NTDP: Heatlh, Wellness, and Retirement Tourism',
  'NTDP: Health, Wellness, and Retirement Tourism'
)
WHERE description LIKE '%NTDP: Heatlh, Wellness, and Retirement Tourism%';

INSERT INTO public.ntdp_categories (ntdp_category_name)
SELECT v.name
FROM (
  VALUES
    ('Leisure and Entertainment Tourism'),
    ('Health, Wellness, and Retirement Tourism')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ntdp_categories nc
  WHERE lower(trim(nc.ntdp_category_name)) = lower(trim(v.name))
);

DELETE FROM public.ntdp_categories
WHERE ntdp_category_name IN (
  'Leasure and Entertainment Tourism',
  'Heatlh, Wellness, and Retirement Tourism'
);
