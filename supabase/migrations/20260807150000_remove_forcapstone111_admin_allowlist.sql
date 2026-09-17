-- Remove temporary admin allowlist email so it can be used for Google signup troubleshooting.
DELETE FROM public.cavitour_admin_allowlist
WHERE lower(email) = lower('forcapstone111@gmail.com');
