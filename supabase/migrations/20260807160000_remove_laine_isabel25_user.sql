-- Remove laine.isabel25@gmail.com from allowlist and Auth (for Google signup troubleshooting).

DELETE FROM public.cavitour_admin_allowlist
WHERE lower(email) = lower('laine.isabel25@gmail.com');

DELETE FROM auth.users
WHERE lower(email) = lower('laine.isabel25@gmail.com');
