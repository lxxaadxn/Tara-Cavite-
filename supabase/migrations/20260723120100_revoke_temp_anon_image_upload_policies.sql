-- Revoke temporary anon upload policies used for one-shot image migration.
DROP POLICY IF EXISTS "temp anon upload place-images" ON storage.objects;
DROP POLICY IF EXISTS "temp anon update place-images" ON storage.objects;
DROP POLICY IF EXISTS "temp anon update tourist_attracted pictures" ON public.tourist_attracted;
