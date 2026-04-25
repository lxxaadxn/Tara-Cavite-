# Supabase terminal dataset — copy-paste order (live app)

Your app calls **`cavitour_routes_for_terminal(p_terminal_id)`** via `lib/fetchTerminalRoutesFromSupabase.ts` using the same project as `lib/supabase.ts`.

Run each **SET** in the SQL Editor **in order** (new query each time is fine).

---

## SET 1 — Create tables

1. Open **SQL Editor** → **New query**.
2. Open the repo file **`supabase/cavitour_terminal_schema.sql`**, copy **all** of it, paste, **Run**.

---

## SET 2 — Load seed data

1. **New query**.
2. Open **`supabase/terminal_dataset_seed.sql`**, copy **all** of it, paste, **Run**.

---

## SET 3 — Row Level Security (anon can read)

1. **New query**.
2. Open **`supabase/cavitour_terminal_rls.sql`**, copy **all** of it, paste, **Run**.

---

## SET 4 — RPC for the mobile app

1. **New query**.
2. Open **`supabase/cavitour_routes_for_terminal_rpc.sql`**, copy **all** of it, paste, **Run**.

---

## SET 5 — Verify (optional)

Run:

```sql
SELECT * FROM public.cavitour_routes_for_terminal(1) LIMIT 5;
```

You should see joined columns (`route_name`, `origin`, `destination`, `transport_name`, …).

---

## App behavior

- **`fetchRoutesForTerminalId`** calls the RPC. If the RPC returns **at least one row**, that list is shown (live data).
- If the RPC **errors** or returns **no rows**, the app falls back to **`data/*_rows.json`** so the UI still works offline.

---

## Updating data later

1. Edit **`data/terminals_cavite_updated.csv`** (and/or adjust **`scripts/build-terminal-sheets.mjs`**).
2. Run: `npm run sheets:all`
3. Re-run **SET 2** only (truncate + insert from regenerated `terminal_dataset_seed.sql`), or update rows in the Table Editor.

---

## Different Supabase project

Change **`lib/supabase.ts`** (`SUPABASE_URL` and `SUPABASE_ANON_KEY`) to match the project where you ran SET 1–4.

---

## After SET 1–4 (before `git push`)

1. **Same project as the app** — In **`lib/supabase.ts`**, `SUPABASE_URL` must be the project where you ran the SQL (ref in URL = project ref).
2. **SQL smoke test** — In SQL Editor, run:
   ```sql
   SELECT count(*) AS terminal_routes FROM public.cavitour_terminal_routes;
   SELECT * FROM public.cavitour_routes_for_terminal(1) LIMIT 3;
   ```
   Expect a non-zero count on `terminal_routes` and 3 sample rows from the RPC.
3. **App smoke test** — `npx expo start` → **Terminals** → open any terminal → **Routes** tab (list should load; live data replaces bundled JSON when RPC returns rows) → **Get directions (map to terminal)** → map + **Routes at this terminal** block.
4. **Lint** — `npm run lint` (fix any new issues in touched files).
5. **Commit** — Include `supabase/*.sql`, `data/sheets/*.csv`, `data/*_rows.json`, `lib/fetchTerminalRoutesFromSupabase.ts`, and screen changes; keep seed + JSON as **offline fallback** (do not delete).
