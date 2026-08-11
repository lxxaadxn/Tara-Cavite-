# OBSOLETE — Supabase terminal dataset

Transport terminals (`cavitour_terminals`, routes, RPC, and `saved_list_terminal_items`) have been **removed from the apps**.

Do **not** re-apply:

- `supabase/cavitour_terminal_schema.sql`
- `supabase/terminal_dataset_seed.sql`
- `supabase/cavitour_terminal_rls.sql`
- `supabase/cavitour_routes_for_terminal_rpc.sql`

To drop remaining objects on a project that still has them, run the migration:

`supabase/migrations/20260802120000_drop_cavitour_terminals.sql`

Places / tourist attractions catalog and GPS→place OSRM routing are unchanged.
