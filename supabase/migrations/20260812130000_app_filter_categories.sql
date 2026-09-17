-- Consumer Filter modal CATEGORY chips (web + mobile).
-- Admin Tourism → Filters CRUD; anon/authenticated can read enabled rows.

CREATE TABLE IF NOT EXISTS public.app_filter_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  short_label text NOT NULL,
  icon text NOT NULL DEFAULT 'nature',
  match_keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_filter_categories_enabled_sort_idx
  ON public.app_filter_categories (is_enabled, sort_order);

ALTER TABLE public.app_filter_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_filter_categories" ON public.app_filter_categories;
CREATE POLICY "Public read app_filter_categories"
  ON public.app_filter_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert app_filter_categories" ON public.app_filter_categories;
CREATE POLICY "Authenticated insert app_filter_categories"
  ON public.app_filter_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update app_filter_categories" ON public.app_filter_categories;
CREATE POLICY "Authenticated update app_filter_categories"
  ON public.app_filter_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete app_filter_categories" ON public.app_filter_categories;
CREATE POLICY "Authenticated delete app_filter_categories"
  ON public.app_filter_categories
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT ON public.app_filter_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_filter_categories TO authenticated;

-- Seed current FilterModal chips + keyword matchers
INSERT INTO public.app_filter_categories (key, label, short_label, icon, match_keywords, sort_order, is_enabled)
VALUES
  (
    'cat-nature',
    'Nature Tourism',
    'Nature',
    'nature',
    ARRAY['nature', 'eco', 'farm', 'agri', 'agritourism', 'wildlife', 'forest'],
    1,
    true
  ),
  (
    'cat-mice',
    'MICE & Events',
    'MICE',
    'mice',
    ARRAY['mice', 'meeting', 'convention', 'conference', 'event venue', 'events', 'banquet'],
    2,
    true
  ),
  (
    'cat-restaurant',
    'Restaurant',
    'Food',
    'restaurant',
    ARRAY['restaurant', 'dining', 'food service', 'eatery', 'bistro', 'cafe', 'café', 'food hub'],
    3,
    true
  ),
  (
    'cat-health',
    'Health, Wellness & Retirement',
    'Wellness',
    'health',
    ARRAY['health', 'wellness', 'spa', 'medical', 'retirement', 'clinic', 'therapy', 'rehab'],
    4,
    true
  ),
  (
    'cat-cultural',
    'Cultural Tourism',
    'Culture',
    'cultural',
    ARRAY['cultural', 'museum', 'church', 'heritage', 'historical', 'shrine', 'parish'],
    5,
    true
  ),
  (
    'cat-education',
    'Education',
    'Education',
    'education',
    ARRAY['education', 'school', 'university', 'college', 'training', 'academy', 'learning'],
    6,
    true
  ),
  (
    'cat-leisure',
    'Leisure and Entertainment',
    'Leisure',
    'leisure',
    ARRAY['leisure', 'entertainment', 'resort', 'recreation', 'amusement', 'park', 'waterpark'],
    7,
    true
  ),
  (
    'cat-shopping',
    'Shopping',
    'Shopping',
    'shopping',
    ARRAY['shopping', 'mall', 'market', 'retail', 'boutique', 'bazaar', 'commercial'],
    8,
    true
  )
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  short_label = EXCLUDED.short_label,
  icon = EXCLUDED.icon,
  match_keywords = EXCLUDED.match_keywords,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();
