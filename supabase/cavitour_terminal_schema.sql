-- OBSOLETE — do not re-apply. Terminals removed; use migration
-- supabase/migrations/20260802120000_drop_cavitour_terminals.sql to drop these objects.
--
-- Tara, Cavite!: sheet-aligned terminal model (matches Google Sheets tabs).
-- Safe table names (cavitour_* prefix). Run once before terminal_dataset_seed.sql

CREATE TABLE IF NOT EXISTS public.cavitour_transport_types (
  transport_type_id smallint PRIMARY KEY,
  transport_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cavitour_terminals (
  terminal_id integer PRIMARY KEY,
  terminal_name text NOT NULL,
  terminal_province text NOT NULL DEFAULT 'Cavite',
  terminal_city text NOT NULL,
  terminal_brgy text NOT NULL DEFAULT '',
  first_trip text NOT NULL DEFAULT '',
  last_trip text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.cavitour_routes (
  route_id integer PRIMARY KEY,
  route_name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cavitour_terminal_routes (
  terminal_route_id integer PRIMARY KEY,
  terminal_id integer NOT NULL REFERENCES public.cavitour_terminals (terminal_id) ON DELETE CASCADE,
  route_id integer NOT NULL REFERENCES public.cavitour_routes (route_id) ON DELETE CASCADE,
  transport_type_id smallint NOT NULL REFERENCES public.cavitour_transport_types (transport_type_id),
  UNIQUE (terminal_id, route_id, transport_type_id)
);

CREATE INDEX IF NOT EXISTS idx_cavitour_terminal_routes_terminal ON public.cavitour_terminal_routes (terminal_id);
CREATE INDEX IF NOT EXISTS idx_cavitour_terminal_routes_route ON public.cavitour_terminal_routes (route_id);
