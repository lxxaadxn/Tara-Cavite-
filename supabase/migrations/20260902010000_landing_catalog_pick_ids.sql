-- Landing catalog pick lists. Does not overwrite existing site_content rows.
INSERT INTO public.site_content (key, value) VALUES
  ('landing.destinations.place_ids', '[]'),
  ('landing.trails.itinerary_ids', '[]')
ON CONFLICT (key) DO NOTHING;
