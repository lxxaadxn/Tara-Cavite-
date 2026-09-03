INSERT INTO public.site_content (key, value) VALUES
  ('brand.tab_title', 'Tara, Cavite! – Your Guide to Exploring Cavite')
ON CONFLICT (key) DO NOTHING;
