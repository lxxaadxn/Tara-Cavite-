-- OBSOLETE — do not re-apply. Terminals removed from the apps.
--
-- SET 3 — Row Level Security: allow the mobile app (anon key) to read terminal data only.
-- Run in SQL Editor AFTER schema + seed.

ALTER TABLE public.cavitour_transport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cavitour_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cavitour_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cavitour_terminal_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cavitour_transport_types_select_all" ON public.cavitour_transport_types;
CREATE POLICY "cavitour_transport_types_select_all"
  ON public.cavitour_transport_types FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "cavitour_terminals_select_all" ON public.cavitour_terminals;
CREATE POLICY "cavitour_terminals_select_all"
  ON public.cavitour_terminals FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "cavitour_routes_select_all" ON public.cavitour_routes;
CREATE POLICY "cavitour_routes_select_all"
  ON public.cavitour_routes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "cavitour_terminal_routes_select_all" ON public.cavitour_terminal_routes;
CREATE POLICY "cavitour_terminal_routes_select_all"
  ON public.cavitour_terminal_routes FOR SELECT
  TO anon, authenticated
  USING (true);
