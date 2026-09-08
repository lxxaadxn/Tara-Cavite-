-- Allow forcapstone111@gmail.com to use the admin app (keep 222 as well).

INSERT INTO public.cavitour_admin_allowlist (email)
VALUES ('forcapstone111@gmail.com')
ON CONFLICT (email) DO NOTHING;
