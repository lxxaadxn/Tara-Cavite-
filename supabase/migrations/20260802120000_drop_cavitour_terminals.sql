-- Drop transport-terminal stack and saved terminal list items.
-- Places / tourist_attractions catalog is untouched.

DROP FUNCTION IF EXISTS public.cavitour_routes_for_terminal(integer);
DROP TABLE IF EXISTS public.cavitour_terminal_routes;
DROP TABLE IF EXISTS public.cavitour_routes;
DROP TABLE IF EXISTS public.cavitour_terminals;
DROP TABLE IF EXISTS public.cavitour_transport_types;
DROP TABLE IF EXISTS public.saved_list_terminal_items;
