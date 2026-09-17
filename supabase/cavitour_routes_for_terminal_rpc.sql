-- OBSOLETE — do not re-apply. Terminals removed from the apps.
--
-- SET 4 — One RPC for the app: all routes for a terminal (joins routes + transport types).
-- Run in SQL Editor AFTER SET 3.

CREATE OR REPLACE FUNCTION public.cavitour_routes_for_terminal(p_terminal_id integer)
RETURNS TABLE (
  terminal_route_id integer,
  route_id integer,
  route_name text,
  origin text,
  destination text,
  transport_type_id smallint,
  transport_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    tr.terminal_route_id,
    r.route_id,
    r.route_name,
    r.origin,
    r.destination,
    tt.transport_type_id,
    tt.transport_name
  FROM public.cavitour_terminal_routes tr
  INNER JOIN public.cavitour_routes r ON r.route_id = tr.route_id
  INNER JOIN public.cavitour_transport_types tt ON tt.transport_type_id = tr.transport_type_id
  WHERE tr.terminal_id = p_terminal_id
  ORDER BY tr.terminal_route_id;
$$;

REVOKE ALL ON FUNCTION public.cavitour_routes_for_terminal(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cavitour_routes_for_terminal(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.cavitour_routes_for_terminal(integer) TO authenticated;
