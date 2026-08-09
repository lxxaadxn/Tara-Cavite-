-- Admin allowlist: only forcapstone222@gmail.com
-- Run in Supabase SQL Editor.
-- Password is NOT set here — create/update the Auth user in the Dashboard (see notes below).

DELETE FROM public.cavitour_admin_allowlist
WHERE lower(email) <> lower('forcapstone222@gmail.com');

INSERT INTO public.cavitour_admin_allowlist (email)
VALUES ('forcapstone222@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Verify:
-- SELECT * FROM public.cavitour_admin_allowlist;
