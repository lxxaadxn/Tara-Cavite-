-- Admin allowlist: forcapstone111 + forcapstone222
-- Run in Supabase SQL Editor if migrations are not applied yet.

INSERT INTO public.cavitour_admin_allowlist (email)
VALUES
  ('forcapstone111@gmail.com'),
  ('forcapstone222@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Verify:
-- SELECT * FROM public.cavitour_admin_allowlist;
